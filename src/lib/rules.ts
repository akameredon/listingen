/**
 * PromptBase decline reasons (promptbase.com/prompt-guidelines, section 3)
 * that can be checked before submission. Used by the generator prompt and the
 * compliance scorer so both share one source of truth.
 */
export const DECLINE_RULES = [
  { id: "template", name: "Prompt template", rule: "Uses 3+ meaningful [square bracket] variables a buyer edits; not a single fixed output." },
  { id: "use_case", name: "Clear use case", rule: "A real buyer has an obvious, practical reason to pay for it (business, creative or personal job)." },
  { id: "too_specific", name: "Not too specific", rule: "Scope is broad enough to serve many buyers; variables open it up rather than lock it to one subject." },
  { id: "consistent_style", name: "Consistent style", rule: "Outputs keep the same recognisable style/structure no matter what values go in the variables." },
  { id: "quality", name: "High-quality output", rule: "Instructions are detailed enough to produce polished, professional output on the target model." },
  { id: "not_guessable", name: "Not too simple / guessable", rule: "Prompt is substantial (image prompts 20+ words of style detail; text prompts with role, context, steps and output format) and can't be reproduced from the title alone." },
  { id: "examples", name: "Varied examples", rule: "Example inputs cover clearly different subjects (image: 9 examples, text: 4) while sharing one style; none are near-duplicates." },
  { id: "test_prompt", name: "Good test prompt", rule: "Every example fills every variable with realistic values that would produce a strong showcase result." },
  { id: "english", name: "English only", rule: "All prompt text, title and description are in clear English." },
  { id: "safe", name: "Safe & allowed", rule: "No NSFW, violence, hate, real-person likeness, medical/legal/financial advice, or anything breaking the target model's rules." },
  { id: "original", name: "Original", rule: "No copyrighted characters, brands, living-artist names or copying of existing listings." },
  { id: "human_crafted", name: "Human-crafted feel", rule: "Reads as a deliberate, tested craft product — not generic filler text. Seller must test and refine before submitting." },
  { id: "listing_copy", name: "Searchable listing copy", rule: "Title is specific and under ~70 chars; description states what, who, benefit; no price claims, ratings or income promises." },
] as const;

export type RuleId = (typeof DECLINE_RULES)[number]["id"];

export type ScoreReport = {
  score: number;
  checks: { id: string; name: string; pass: boolean; note: string }[];
  fixes: string[];
};

export const STATUSES = ["draft", "ready", "submitted", "approved", "declined"] as const;
export type Status = (typeof STATUSES)[number];
