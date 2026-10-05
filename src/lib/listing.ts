import { z } from "zod";

export const NICHES = [
  "Art & Illustration",
  "Logo & Icon",
  "Graphics & Design",
  "Photography & Content Creation",
  "Marketing & Business",
  "Copywriting & SEO",
  "Programming & Code",
  "Academic & Education",
  "Gaming & Entertainment",
  "Productivity & Workflow",
  "Other",
] as const;

export const MODELS = [
  "GPT-4.1 / ChatGPT",
  "Claude 3.5 Sonnet",
  "Gemini 2.0",
  "Midjourney v6 / v6.1",
  "DALL·E 3",
  "Stable Diffusion / SDXL",
  "Sora / Video models",
  "Other",
] as const;

export const OUTPUT_TYPES = [
  "Text (articles, copy, scripts, etc.)",
  "Image (illustrations, icons, photos, etc.)",
  "Video",
  "Code",
  "Structured data (JSON, CSV, tables)",
  "Other",
] as const;

export const PRICES = [
  "Budget ($2.99–$4.99)",
  "Mid-range ($5.99–$9.99)",
  "Premium ($10–$19.99)",
] as const;

export const listingInputSchema = z.object({
  core_idea: z.string().min(1).max(2000),
  niche: z.string().min(1).max(100),
  niche_other: z.string().max(200).default(""),
  target_model: z.string().min(1).max(100),
  target_model_other: z.string().max(200).default(""),
  primary_use_case: z.string().min(1).max(2000),
  secondary_use_cases: z.string().max(2000).default(""),
  output_type: z.string().min(1).max(100),
  output_style: z.string().min(1).max(2000),
  variables_list: z.string().min(1).max(2000),
  price_target: z.string().min(1).max(100),
  revenue_goal: z.string().max(200).default(""),
  competitor_notes: z.string().max(2000).default(""),
  avoid_topics: z.string().max(2000).default(""),
});

export type ListingInput = z.infer<typeof listingInputSchema>;

export const emptyInput: ListingInput = {
  core_idea: "",
  niche: "",
  niche_other: "",
  target_model: "",
  target_model_other: "",
  primary_use_case: "",
  secondary_use_cases: "",
  output_type: "",
  output_style: "",
  variables_list: "",
  price_target: "",
  revenue_goal: "",
  competitor_notes: "",
  avoid_topics: "",
};

export type Field = {
  key: keyof ListingInput;
  label: string;
  help?: string;
  kind: "long" | "short" | "select";
  options?: readonly string[];
  required?: boolean;
  placeholder?: string;
  showIf?: (v: ListingInput) => boolean;
};

export type Step = { title: string; blurb: string; fields: Field[] };

export const STEPS: Step[] = [
  {
    title: "Core idea",
    blurb: "What are you selling?",
    fields: [
      {
        key: "core_idea",
        kind: "long",
        required: true,
        label: "In 1–3 sentences, what's the main idea of the prompt you want to sell?",
        placeholder: "e.g. A prompt that generates SEO product descriptions for Shopify stores",
      },
    ],
  },
  {
    title: "Niche & model",
    blurb: "Where it sells and where it runs",
    fields: [
      { key: "niche", kind: "select", required: true, label: "Niche", options: NICHES },
      {
        key: "niche_other",
        kind: "short",
        label: "Specify your niche",
        showIf: (v) => v.niche === "Other",
        required: true,
      },
      { key: "target_model", kind: "select", required: true, label: "Target AI model", options: MODELS },
      {
        key: "target_model_other",
        kind: "short",
        label: "Specify the model",
        showIf: (v) => v.target_model === "Other",
        required: true,
      },
    ],
  },
  {
    title: "Audience",
    blurb: "Who is it for?",
    fields: [
      {
        key: "primary_use_case",
        kind: "long",
        required: true,
        label: "Who is this prompt for, and what job does it help them do?",
        placeholder: "e.g. E-commerce store owners who need fast, high-converting product descriptions",
      },
      {
        key: "secondary_use_cases",
        kind: "long",
        label: "Any additional use cases or audiences? (optional)",
      },
    ],
  },
  {
    title: "Output & style",
    blurb: "What buyers get back",
    fields: [
      { key: "output_type", kind: "select", required: true, label: "Output type", options: OUTPUT_TYPES },
      {
        key: "output_style",
        kind: "long",
        required: true,
        label: "Describe the desired style and quality of outputs",
        placeholder: "e.g. professional, benefit-focused, 150-word product descriptions",
      },
    ],
  },
  {
    title: "Variables",
    blurb: "What buyers can customise",
    fields: [
      {
        key: "variables_list",
        kind: "long",
        required: true,
        label: "List the main things buyers should customise via [square brackets]",
        placeholder: "[product_name], [brand_voice], [target_audience], [word_count]",
      },
    ],
  },
  {
    title: "Pricing",
    blurb: "Positioning and goals",
    fields: [
      { key: "price_target", kind: "select", required: true, label: "Price tier", options: PRICES },
      {
        key: "revenue_goal",
        kind: "short",
        label: "Rough monthly revenue goal (optional)",
        placeholder: "$100/month",
      },
    ],
  },
  {
    title: "Competitors",
    blurb: "What makes yours different",
    fields: [
      {
        key: "competitor_notes",
        kind: "long",
        label: "Seen similar prompts on PromptBase? What will make yours better? (optional)",
      },
    ],
  },
  {
    title: "Compliance",
    blurb: "Topics to stay away from",
    fields: [
      {
        key: "avoid_topics",
        kind: "long",
        label: "Any topics you definitely want to avoid? (optional)",
        placeholder: "e.g. medical advice, financial guarantees, adult content",
      },
    ],
  },
];

export const SECTION_TITLES = [
  "Title",
  "Short Description",
  "Full Description",
  "Prompt Template",
  "Example Inputs & Outputs",
  "User Instructions",
  "Suggested Price & Rationale",
  "Tags / Categories",
  "Visibility Study & SEO",
  "Decline-Risk Checklist",
];

/** Split generated markdown into sections on "## N." headings. */
export function splitSections(md: string): { n: number; heading: string; body: string }[] {
  const re = /^##\s*(\d+)\.\s*(.*)$/gm;
  const marks: { n: number; heading: string; start: number; bodyStart: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(md))) {
    marks.push({ n: Number(m[1]), heading: m[2] ?? "", start: m.index, bodyStart: m.index + m[0].length });
  }
  return marks.map((mk, i) => ({
    n: mk.n,
    heading: mk.heading,
    body: md.slice(mk.bodyStart, marks[i + 1]?.start ?? md.length).trim(),
  }));
}
