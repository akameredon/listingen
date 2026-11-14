import { supabase } from "@/integrations/supabase/client";
import { extractMeta } from "@/lib/listing-client";
import type { ListingInput } from "@/lib/listing";
import { assessPromptPackage } from "@/lib/verification";
import { findDuplicate } from "@/lib/listing-client";

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
      folder: "Uncategorized",
      tags: [],
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
    .select("id,title,idea,input,output,template,status,folder,tags,created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data as ListingRow[];
}

export async function updateListingDraft(args: { id: string; title: string; idea: string; output: string; folder: string; tags: string[] }) {
  await requireUser();
  const meta = extractMeta(args.output);
  const { data, error } = await supabase.from("listings").update({
    title: args.title.trim().slice(0,160) || meta.title,
    idea: args.idea.trim().slice(0,2000),
    output: args.output,
    template: meta.template,
    folder: args.folder.trim().slice(0,60) || "Uncategorized",
    tags: args.tags.slice(0,20),
  }).eq("id",args.id).select("id,title,status,folder,tags,created_at").single();
  if(error)throw error;
  return data;
}

export async function duplicateListingDraft(listing: ListingRow) {
  const user=await requireUser();
  const {data,error}=await supabase.from("listings").insert({
    user_id:user.id,title:`Copy of ${listing.title}`.slice(0,160),idea:listing.idea,
    input:listing.input as import("@/integrations/supabase/types").Json,
    output:listing.output,template:listing.template,status:"draft",
    folder:listing.folder,tags:listing.tags,
  }).select("id,title,status,folder,tags,created_at").single();
  if(error)throw error;
  return data;
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

export async function createProductVersion(args: {
  productId: string;
  promptContent: string;
  instructions: string;
  changelog: string;
}) {
  const user = await requireUser();
  if (args.promptContent.trim().length < 40) throw new Error("The prompt version needs at least 40 characters.");
  const { data: previous, error: historyError } = await supabase
    .from("product_versions").select("version_number").eq("product_id", args.productId)
    .order("version_number", { ascending: false }).limit(1);
  if (historyError) throw historyError;
  const nextVersion = (previous?.[0]?.version_number ?? 0) + 1;
  const { data: version, error: versionError } = await supabase
    .from("product_versions").insert({
      product_id: args.productId,
      version_number: nextVersion,
      prompt_content: args.promptContent,
      instructions: args.instructions,
      changelog: args.changelog,
      verification_state: "documented",
      verification_evidence: { state: "documented", note: "New creator-authored version; execution has not been independently reproduced." },
      created_by: user.id,
    }).select("id,version_number,verification_state,created_at").single();
  if (versionError) throw versionError;
  const { error: productError } = await supabase.from("marketplace_products").update({
    current_version_id: version.id,
    status: "draft",
    published_at: null,
  }).eq("id", args.productId);
  if (productError) throw productError;
  return version;
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

  const { data: visibleVersions, error: duplicateError } = await supabase
    .from("product_versions")
    .select("id,product_id,prompt_content,marketplace_products(title)")
    .neq("id", versionId)
    .limit(100);
  if (duplicateError) throw duplicateError;
  const duplicate = findDuplicate(
    versionResult.data.prompt_content,
    (visibleVersions ?? []).map((version) => ({
      id: version.id,
      title: (version.marketplace_products as { title?: string } | null)?.title ?? "Untitled product",
      template: version.prompt_content,
    })),
    versionId,
  );
  const exactMatch = (visibleVersions ?? []).find((version) => version.prompt_content === versionResult.data.prompt_content);

  const originalityReport = {
    ...assessment.originality,
    exactDuplicateCheck: exactMatch ? "match_found_in_visible_catalog" : "no_exact_match_in_visible_catalog",
    similarityCheck: duplicate ? { matched: true, versionId: duplicate.id, title: duplicate.title, similarity: Number(duplicate.sim.toFixed(3)) } : { matched: false },
    disclaimer: "Similarity screening compares up to 100 records visible to the submitting user and public catalog. It is a triage signal only and does not establish authorship or plagiarism clearance.",
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
