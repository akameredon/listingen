import { z } from "zod";

export const appsGamesInputSchema = z.object({
  product_type: z.enum(["app", "game"]),
  coding_agent: z.enum(["Claude Code", "Google Antigravity", "Codex", "Cursor Agent"]),
  project_name: z.string().max(100).default(""),
  core_idea: z.string().min(20).max(3000),
  target_audience: z.string().min(5).max(1000),
  core_features: z.string().min(20).max(3000),
  platform: z.string().min(2).max(300),
  visual_direction: z.string().min(5).max(1500),
  preferred_stack: z.string().max(1000).default("Recommend the simplest reliable stack for this product"),
  integrations: z.string().max(1500).default("None specified"),
  app_workflows: z.string().max(2000).default(""),
  game_genre: z.string().max(200).default(""),
  gameplay_loop: z.string().max(2000).default(""),
  price_target: z.string().min(1).max(50),
  build_time: z.enum(["Under 15 minutes", "15 minutes to 1 hour", "1 to 3 hours", "Over 3 hours", "Not yet tested"]),
});

export type AppsGamesInput = z.infer<typeof appsGamesInputSchema>;

export const emptyAppsGamesInput: AppsGamesInput = {
  product_type: "app",
  coding_agent: "Claude Code",
  project_name: "",
  core_idea: "",
  target_audience: "",
  core_features: "",
  platform: "Responsive web app",
  visual_direction: "",
  preferred_stack: "",
  integrations: "",
  app_workflows: "",
  game_genre: "",
  gameplay_loop: "",
  price_target: "$4.99",
  build_time: "Not yet tested",
};
