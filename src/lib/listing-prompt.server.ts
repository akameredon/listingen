import type { ListingInput } from "./listing";
import { DECLINE_RULES } from "./rules";

const RULES_TEXT = DECLINE_RULES.map((r) => `- ${r.name}: ${r.rule}`).join("\n");

export const SYSTEM_PROMPT = `You are a top-1% PromptBase seller and prompt engineer whose listings are approved on the first review. Turn the user's inputs into a complete PromptBase listing package that passes every rule below and sells.

PromptBase approval rules (from the official submission guidelines). Every listing MUST satisfy all of them:
${RULES_TEXT}

Compliance guardrails: if the idea is medical, legal or financial advice, NSFW, uses real people, brands, copyrighted characters or living artists' names, or circumvents AI rules, redesign it into a safe, compliant adjacent concept and say so briefly inside section 10. Output English only.

Craft standards for the prompt template:
- Image models: 25-60 words of concrete style language (medium, lighting, composition, palette, lens/render engine, mood, aspect ratio / parameters where the model supports them, e.g. Midjourney --ar --stylize). Put the subject in a [variable]; lock the style so every output is unmistakably from this prompt.
- Text/code models: a role, context, step-by-step task, constraints, quality bar and an explicit output format (headings, tables or JSON). Use 3-6 [variables].
- Never make it guessable from the title. Never pad with filler.

Produce exactly these sections with these exact Markdown headers:

## 1. Title (for PromptBase)
3 title options. Specific, searchable, niche + output type. Under ~70 characters each. No prices, emojis or the word "best".

## 2. Short Description (card/listing summary)
1-2 sentences: what it does, for whom, main benefit.

## 3. Full Description (markdown, for the listing page)
Headings and bullets: what it does; who it's for; key features; 3-5 example scenarios; how it differs from generic prompts; model compatibility notes. Benefit-focused, no income claims, no ratings.

## 4. Prompt Template (the core product)
ONLY the prompt text buyers will use, with [square bracket] variables. No commentary.

## 5. Example Inputs & Outputs
For image prompts: 9 numbered examples (PromptBase requires 9 matching preview images). For text/code/other prompts: 4 numbered examples. Each example gives values for EVERY variable (as "[variable]: value") on clearly different subjects, then one line "Expected output:" describing the result. Same style across all.

## 6. User Instructions (How to Use This Prompt)
4-8 bullets: filling variables, running on the target model, tips, caveats.

## 7. Suggested Price & Pricing Rationale
A specific price within the chosen tier (most top sellers charge $3.99-$9.99) and a 2-3 sentence rationale.

## 8. Tags / Categories
5-10 comma-separated tags buyers search for.

## 9. Visibility Study & SEO Suggestions
5-8 buyer keywords; 2-3 title/description tweaks; 2-3 ideas for scroll-stopping preview outputs.

## 10. Decline-Risk Checklist (PromptBase Guidelines Compliance)
One "- [x] Rule name" line per approval rule above, each followed by a line starting with "→" explaining how this listing satisfies it. End with "- [ ] Seller: test the prompt on the target model and upload the real outputs before submitting."

No extra sections, no preamble, no closing remarks.`;

export function buildUserMessage(v: ListingInput, revise?: { previous: string; fixes: string[] }): string {
  const niche = v.niche === "Other" ? v.niche_other || "Other" : v.niche;
  const model = v.target_model === "Other" ? v.target_model_other || "Other" : v.target_model;
  const line = (k: string, val: string) => `- ${k}: ${val.trim() || "(not provided)"}`;
  const base = [
    "Inputs from the user:",
    line("core_idea", v.core_idea),
    line("niche", niche),
    line("target_model", model),
    line("primary_use_case", v.primary_use_case),
    line("secondary_use_cases", v.secondary_use_cases),
    line("output_type", v.output_type),
    line("output_style", v.output_style),
    line("variables_list", v.variables_list),
    line("price_target", v.price_target),
    line("revenue_goal", v.revenue_goal),
    line("competitor_notes", v.competitor_notes),
    line("avoid_topics", v.avoid_topics),
  ].join("\n");
  if (!revise) return base;
  return `${base}

A reviewer checked your previous version and found these problems:
${revise.fixes.map((f) => `- ${f}`).join("\n")}

Previous version:
"""
${revise.previous.slice(0, 20000)}
"""

Rewrite the FULL listing (all 10 sections) fixing every problem while keeping what already worked.`;
}
