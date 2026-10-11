import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { listingInputSchema, type ListingInput } from "./listing";
import { DECLINE_RULES, type ScoreReport } from "./rules";

const shared = z.object({
  niche: z.string().min(1).max(100),
  target_model: z.string().min(1).max(100),
  output_type: z.string().min(1).max(100),
  price_target: z.string().min(1).max(100),
  avoid_topics: z.string().max(1000).default(""),
});

const planSchema = z.discriminatedUnion("mode", [
  shared.extend({ mode: z.literal("theme"), theme: z.string().min(2).max(1000), count: z.number().int().min(1).max(20) }),
  shared.extend({ mode: z.literal("list"), ideas: z.array(z.string().min(2).max(500)).min(1).max(50) }),
]);

const PLAN_ITEM = {
  type: "OBJECT",
  properties: {
    core_idea: { type: "STRING" },
    primary_use_case: { type: "STRING" },
    secondary_use_cases: { type: "STRING" },
    output_style: { type: "STRING" },
    variables_list: { type: "STRING" },
    competitor_notes: { type: "STRING" },
  },
  required: ["core_idea", "primary_use_case", "secondary_use_cases", "output_style", "variables_list", "competitor_notes"],
};

/** Expands a theme (or a list of rough ideas) into complete, distinct listing briefs. */
export const planInputs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => planSchema.parse(d))
  .handler(async ({ data }) => {
    const { geminiGenerate, parseJson } = await import("./gemini.server");
    const ask =
      data.mode === "theme"
        ? `Create ${data.count} DISTINCT PromptBase prompt concepts around this theme: "${data.theme}". Each must target a different buyer job or visual style so none are near-duplicates of each other.`
        : `Turn each of these ${data.ideas.length} rough ideas into one complete concept, in the same order:\n${data.ideas.map((i, n) => `${n + 1}. ${i}`).join("\n")}`;
    const text = await geminiGenerate({
      system: `You plan best-selling, approval-safe PromptBase listings. Rules every concept must pass:\n${DECLINE_RULES.map((r) => `- ${r.rule}`).join("\n")}\nNiche: ${data.niche}. Target model: ${data.target_model}. Output type: ${data.output_type}. Avoid: ${data.avoid_topics || "nothing extra"}. Write variables_list as [snake_case] variables with a short hint each. English only.`,
      user: ask,
      schema: { type: "ARRAY", items: PLAN_ITEM },
    });
    const items = parseJson<Partial<ListingInput>[]>(text);
    return items.slice(0, data.mode === "theme" ? data.count : data.ideas.length).map((it) =>
      listingInputSchema.parse({
        ...it,
        niche: data.niche,
        niche_other: "",
        target_model: data.target_model,
        target_model_other: "",
        output_type: data.output_type,
        price_target: data.price_target,
        revenue_goal: "",
        avoid_topics: data.avoid_topics,
        core_idea: (it.core_idea || "Untitled idea").slice(0, 2000),
        primary_use_case: (it.primary_use_case || "General buyers").slice(0, 2000),
        output_style: (it.output_style || "Consistent, professional").slice(0, 2000),
        variables_list: (it.variables_list || "[subject]").slice(0, 2000),
        secondary_use_cases: (it.secondary_use_cases || "").slice(0, 2000),
        competitor_notes: (it.competitor_notes || "").slice(0, 2000),
      }),
    );
  });

/** Grades a finished listing against every PromptBase decline rule. */
export const scoreListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ output: z.string().min(50).max(40000) }).parse(d))
  .handler(async ({ data }): Promise<ScoreReport> => {
    const { geminiGenerate, parseJson } = await import("./gemini.server");
    const text = await geminiGenerate({
      system: `You are a strict PromptBase reviewer. Judge the listing against each rule and be harsh: a pass means you'd approve it. Rules:\n${DECLINE_RULES.map((r) => `${r.id} | ${r.name}: ${r.rule}`).join("\n")}\nFor "human_crafted" pass only if the prompt is specific and deliberate. Give concrete, actionable fixes for every failed or weak rule.`,
      user: data.output,
      schema: {
        type: "OBJECT",
        properties: {
          checks: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: { id: { type: "STRING" }, pass: { type: "BOOLEAN" }, note: { type: "STRING" } },
              required: ["id", "pass", "note"],
            },
          },
          fixes: { type: "ARRAY", items: { type: "STRING" } },
        },
        required: ["checks", "fixes"],
      },
    });
    const raw = parseJson<{ checks: { id: string; pass: boolean; note: string }[]; fixes: string[] }>(text);
    const checks = DECLINE_RULES.map((r) => {
      const c = raw.checks.find((x) => x.id === r.id);
      return { id: r.id, name: r.name, pass: c?.pass ?? false, note: c?.note ?? "Not assessed." };
    });
    const score = Math.round((checks.filter((c) => c.pass).length / checks.length) * 100);
    return { score, checks, fixes: (raw.fixes ?? []).slice(0, 12) };
  });

/** Live buyer-demand ideas for a niche, grounded in a web search. */
export const trendIdeas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ niche: z.string().min(1).max(100), target_model: z.string().min(1).max(100) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { geminiGenerate, parseJson } = await import("./gemini.server");
    const text = await geminiGenerate({
      search: true,
      system:
        "You are a marketplace analyst for AI prompt sellers. Use web search to find what people currently need from AI in this niche (seasonal events, trending styles, business needs). Reply with ONLY a JSON array, no prose.",
      user: `Niche: ${data.niche}. Model: ${data.target_model}. Return 8 items as JSON: [{"idea":"one-sentence prompt concept","why":"why buyers want it now","demand":"high|medium","keywords":"comma separated search terms"}]. Each must be broad, templatable, safe and different from the others.`,
    });
    return parseJson<{ idea: string; why: string; demand: string; keywords: string }[]>(text).slice(0, 10);
  });

/** Renders one example preview image for an image-prompt listing. */
export const exampleImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ prompt: z.string().min(5).max(4000) }).parse(d))
  .handler(async ({ data }) => {
    const { geminiImage } = await import("./gemini.server");
    return { url: await geminiImage(data.prompt) };
  });
