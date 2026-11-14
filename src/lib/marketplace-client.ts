import { supabase } from "@/integrations/supabase/client";
import { extractMeta } from "@/lib/listing-client";
import type { ListingInput } from "@/lib/listing";\nimport { assessPromptPackage } from "@/lib/verification";

export type ListingRow = {
  id: string;
  title: string;
  idea: string;
  input: unknown;
  output: string;
  template: string;
  status: string;
  created_at: string;
};

export type ProductRow = {
  id: string;
  creator_id: string;
  slug: string;
  title: string;
  short_description: string;
  description: string;
  category: string;
  tags: string[];
  preview_content: string;
  price_amount: number;
  currency: string;
  status: string;
  current_version_id: string | null;
  created_at: string;
  updated_at: string;
};

export async function requireUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Sign in to continue.");
  return data.user;
}

export async function savePromptPackage(input: import("@/integrations/supabase/types").Json, idea: string, output: string) {
  const user = await requireUser();
  const meta = extractMeta(output);
  const { data, error } = await supabase
    .from("listings")
    .insert({
      user_id: user.id,
      title: meta.title,
      idea: idea.slice(0, 2000),
      input,
      output,
      template: meta.template,
      status: "draft",
    })
    .select("id,title,status,created_at")
    .single();
  if (error) throw error;
  return data;
}

export async function saveListing(input: ListingInput, output: string) {
  return savePromptPackage(
    input as unknown as import("@/integrations/supabase/types").Json,
    input.core_idea,
    output,
  );
}

export async function getMyListings() {
  await requireUser();
  const { data, error } = await supabase
    .from("listings")
    .select("id,title,idea,input,output,template,status,created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data as ListingRow[];
}

export async function getMyProducts() {
  await requireUser();
  const { data, error } = await supabase
    .from("marketplace_products")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data as ProductRow[];
}

export async function createProductFromListing(args: {
  listing: ListingRow;
  priceAmount: number;
  currency: string;
  category: string;
  shortDescription: string;
}) {
  const user = await requireUser();
  const slugBase = args.listing.title.toLowerCase().normalize("NFKD")
    .replace(/[\\u0300-\\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 55) || "prompt";
  const slug = `${slugBase}-${crypto.randomUUID().slice(0, 8)}`;
  const { data: product, error: productError } = await supabase
    .from("marketplace_products")
    .insert({
      creator_id: user.id,
      source_listing_id: args.listing.id,
      slug,
      title: args.listing.title.slice(0, 160),
      short_description: args.shortDescription.slice(0, 240),
      description: args.listing.output.slice(0, 12000),
      category: args.category,
      tags: [],
      preview_content: args.listing.output.slice(0, 1200),
      price_amount: Math.max(0, Math.round(args.priceAmount)),
      currency: args.currency.toUpperCase(),
      status: "draft",
    })
    .select("*")
    .single();
  if (productError) throw productError;

  const { data: version, error: versionError } = await supabase
    .from("product_versions")
    .insert({
      product_id: product.id,
      version_number: 1,
      prompt_content: args.listing.template || args.listing.output,
      instructions: "Follow the instructions included in this listing. Replace every bracketed variable before use.",
      changelog: "Initial creator submission.",
      verification_state: "documented",
      verification_evidence: { state: "documented", note: "Creator-submitted; execution has not been independently reproduced." },
      created_by: user.id,
    })
    .select("id")
    .single();
  if (versionError) throw versionError;

  const { error: updateError } = await supabase
    .from("marketplace_products")
    .update({ current_version_id: version.id })
    .eq("id", product.id);
  if (updateError) throw updateError;
  return { ...product, current_version_id: version.id } as ProductRow;
}

export async function submitProductForReview(productId: string, versionId: string) {
  const user = await requireUser();
  const [productResult, versionResult] = await Promise.all([
    supabase.from("marketplace_products").select("title,short_description,description,category").eq("id", productId).single(),
    supabase.from("product_versions").select("prompt_content,instructions").eq("id", versionId).single(),
  ]);
  if (productResult.error) throw productResult.error;
  if (versionResult.error) throw versionResult.error;

  const assessment = assessPromptPackage({
    title: productResult.data.title,
    shortDescription: productResult.data.short_description,
    description: productResult.data.description,
    category: productResult.data.category,
    promptContent: versionResult.data.prompt_content,
    instructions: versionResult.data.instructions,
  });

  const { data: exactMatches, error: duplicateError } = await supabase
    .from("product_versions")
    .select("id,product_id")
    .eq("prompt_content", versionResult.data.prompt_content)
    .neq("id", versionId)
    .limit(1);
  if (duplicateError) throw duplicateError;

  const originalityReport = {
    ...assessment.originality,
    exactDuplicateCheck: exactMatches?.length ? "match_found_in_visible_catalog" : "no_exact_match_in_visible_catalog",
    matchingVersionId: exactMatches?.[0]?.id ?? null,
    disclaimer: "This checks exact text matches only within records visible to the submitting user and public catalog. It does not establish authorship or plagiarism clearance.",
  };

  const { data: submission, error } = await supabase
    .from("review_submissions")
    .insert({
      product_id: productId,
      version_id: versionId,
      submitted_by: user.id,
      status: "pending",
      quality_score: assessment.qualityScore,
      completeness_report: assessment.completeness,
      originality_report: originalityReport,
      compliance_report: assessment.compliance,
      reproducibility_report: assessment.reproducibility,
    })
    .select("*")
    .single();
  if (error) throw error;

  const { error: updateError } = await supabase
    .from("marketplace_products")
    .update({ status: "in_review" })
    .eq("id", productId);
  if (updateError) throw updateError;
  return submission;
}

export async function getPublishedProducts(search = "", category = "All") {
  let query = supabase.from("marketplace_products")
    .select("id,creator_id,slug,title,short_description,description,category,tags,preview_content,price_amount,currency,status,current_version_id,created_at,updated_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(60);
  if (search.trim()) query = query.textSearch("title", search.trim(), { type: "websearch", config: "english" });
  if (category !== "All") query = query.eq("category", category);
  const { data, error } = await query;
  if (error) throw error;
  return data as ProductRow[];
}

export async function getProductBySlug(slug: string) {
  const { data, error } = await supabase
    .from("marketplace_products")
    .select("id,creator_id,slug,title,short_description,description,category,tags,preview_content,price_amount,currency,status,current_version_id,created_at,updated_at")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw error;
  return data as ProductRow | null;
}
