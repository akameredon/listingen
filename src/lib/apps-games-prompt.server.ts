import type { AppsGamesInput } from "./apps-games";

const AGENT_GUIDANCE: Record<AppsGamesInput["coding_agent"], string> = {
  "Claude Code": "Work as an autonomous senior engineer inside the supplied repository. Inspect files and CLAUDE.md/AGENTS.md first, plan briefly, make incremental edits, run available checks, and report exact files changed and commands/results.",
  "Google Antigravity": "Use an agent-first plan/implement/verify workflow. Inspect the workspace and project rules first, create a task plan, implement in small verifiable steps, use browser preview where available, and report evidence from tests and the running app.",
  Codex: "Inspect the repository and AGENTS.md first. Establish the current architecture, propose a concise plan, implement the smallest coherent diff, run tests/build/lint where available, and summarize changed files and verification evidence.",
  "Cursor Agent": "Inspect the codebase and project rules first. Build incrementally with focused edits, use the existing conventions, run relevant tests and the app, fix discovered issues, and summarize changed files and verification evidence.",
};

export function buildAppsGamesUserMessage(v: AppsGamesInput) {
  const type = v.product_type === "game" ? "game" : "application";
  const productSpecific = v.product_type === "game"
    ? `Game genre: ${v.game_genre || "Choose the best-fit genre from the idea"}
Gameplay loop and mechanics: ${v.gameplay_loop || "Derive a clear core loop from the idea, and state assumptions explicitly"}`
    : `Primary user workflows and screens: ${v.app_workflows || "Derive the essential screens and end-to-end user journeys from the idea"}`;

  return `Create a high-quality PromptBase Apps & Games product package for this ${type}.

PROJECT INPUTS
Project name: ${v.project_name || "Generate a memorable, searchable name"}
Target coding agent: ${v.coding_agent}
Core idea: ${v.core_idea}
Target audience: ${v.target_audience}
Core features: ${v.core_features}
Platform: ${v.platform}
Visual direction: ${v.visual_direction}
Preferred technology stack: ${v.preferred_stack || "Recommend the simplest reliable stack"}
Integrations: ${v.integrations || "None specified"}
${productSpecific}
Suggested PromptBase price: ${v.price_target}
Build-time estimate supplied by creator: ${v.build_time}

TARGET AGENT EXECUTION GUIDANCE
${AGENT_GUIDANCE[v.coding_agent]}

REQUIREMENTS
Produce a genuinely useful, specific, reproducible coding-agent prompt—not a generic "build any app/game" template. Make the project scope concrete. Preserve existing repository architecture and user data if the buyer runs it in an existing project. Never overwrite or delete existing data without explicit permission. Require the agent to inspect the repository and project instructions before editing. If starting from an empty workspace, scaffold deliberately and explain prerequisites.

For an APP: define user roles, routes/screens, key user journeys, data model, validation, loading/empty/error states, responsive behavior, accessibility, security and integration boundaries. Do not invent integrations or credentials. Specify realistic persistence behavior and environment variables.

For a GAME: define the core gameplay loop, controls, objective, progression, scoring/win-loss states, difficulty curve, feedback/juice, responsive input, restart/pause behavior, performance constraints and playable acceptance tests. Ensure the first playable version is achievable and fun before adding optional polish.

For BOTH: give a staged implementation plan; specify component/module boundaries; state assumptions; include acceptance criteria; require the agent to run the actual app, test the main user journeys or game loop, inspect console/build errors, fix issues, and report any unverified requirements honestly. Do not claim deployment, testing, multiplayer, payments, AI features or integrations work unless implemented and verified. Include setup, run, test and deployment instructions appropriate to the chosen stack.

OUTPUT EXACTLY THESE SECTIONS
## 1. Prompt Name
One strong title, ideally under 30 characters, plus two alternatives.

## 2. Short Description
A buyer-focused 1–2 sentence summary.

## 3. Full Description
What the build creates, intended buyer, main capabilities, differentiators and realistic compatibility notes.

## 4. Prompt Template
The complete copy-and-run prompt for ${v.coding_agent}. Include editable [square-bracket] variables for project-specific details. It must be detailed, operational and agent-aware. Include the staged plan and verification gates.

## 5. Example Inputs & Expected Outputs
Four distinct example configurations for this specific product concept. Fill every variable and describe the expected build outcome. Do not imply that examples were actually executed.

## 6. User Instructions
Step-by-step instructions for using the prompt with ${v.coding_agent}, including workspace preparation, how to provide assets/credentials safely, when to approve destructive changes, and how to evaluate the result.

## 7. Suggested Price
Use ${v.price_target} as the creator's requested price and explain briefly that the seller should compare similar listings and validate demand. Do not promise sales.

## 8. Tags
8–12 relevant search tags.

## 9. Technology Stack
Recommend a practical stack, distinguishing required from optional technologies. Respect the creator's preferences where reasonable.

## 10. Approximate Build Time
Creator estimate: ${v.build_time}. If not tested, explicitly label it unverified and do not fabricate a duration.

## 11. Showcase & Submission Checklist
List genuine screenshots, 1–4 screen recordings, a public playable/demo URL where applicable, setup instructions, and what must be tested before claiming the build is reproduced.

## 12. Reproducibility & Compliance Checklist
Checklist covering originality, clear scope, complete instructions, safe credentials, no unsupported claims, actual execution tests, honest build-time estimates, and seller verification. Explicitly distinguish documented, reproduced and published.

QUALITY RULES
- Never copy an existing creator's prompt, code, assets or distinctive product.
- Do not claim a generated prompt has been executed.
- No invented demo URLs, videos, screenshots, ratings or performance results.
- Keep the product buildable and testable; mark optional stretch features.
- English only. No income guarantees.
- Make all variable names consistent between the template and examples.
- Output the full package without a preamble or closing remarks.`;
}

export const APPS_GAMES_SYSTEM_PROMPT = `You are a senior coding-agent prompt engineer and careful PromptBase listing editor. Produce specific, commercially useful, reproducible Apps & Games prompt packages. Follow the user's project constraints, avoid generic boilerplate, distinguish assumptions from requirements, and never claim work was executed or tested when it was not. The prompt must instruct the selected coding agent to inspect the repository and preserve existing data before making changes. Do not copy third-party proprietary prompts or assets. Return only the exact requested Markdown sections.`;
