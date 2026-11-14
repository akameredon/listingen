import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Copy, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { emptyAppsGamesInput, type AppsGamesInput } from "@/lib/apps-games";

export const Route = createFileRoute("/apps-games")({
  head: () => ({
    meta: [
      { title: "Apps & Games Prompt Generator — Listingen" },
      { name: "description", content: "Create agent-ready prompts and PromptBase listings for apps and games." },
    ],
  }),
  component: AppsGamesPage,
});

const inputClass = "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30";
const agents = ["Claude Code", "Google Antigravity", "Codex", "Cursor Agent"] as const;

function AppsGamesPage() {
  const [v, setV] = useState<AppsGamesInput>(emptyAppsGamesInput);
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const set = (key: keyof AppsGamesInput, value: string) => setV((old) => ({ ...old, [key]: value }));

  async function generate() {
    setLoading(true); setError(""); setOutput("");
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const response = await fetch("/api/apps-games", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ input: v }),
      });
      if (!response.ok) throw new Error((await response.text()) || "Unable to generate. Please try again.");
      setOutput(await response.text());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to generate. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  const required = [v.core_idea.trim().length >= 20, v.target_audience.trim().length >= 5, v.core_features.trim().length >= 20, v.platform.trim().length >= 2, v.visual_direction.trim().length >= 5, Boolean(v.price_target)];
  const valid = required.every(Boolean) && (v.product_type !== "game" || v.game_genre.trim().length > 0);

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link to="/" className="mb-7 inline-flex items-center gap-2 text-sm text-primary"><ArrowLeft className="size-4" /> Back to Listing Generator</Link>
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">Listingen · New generator</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">Apps & Games</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">Turn an app or game idea into a detailed coding-agent build prompt and a PromptBase-ready listing package. Generated instructions are not represented as tested builds.</p>

        <div className="mt-7 grid grid-cols-2 gap-3">
          {(["app", "game"] as const).map((type) => (
            <button key={type} type="button" onClick={() => set("product_type", type)} className={`rounded-xl border p-4 text-left transition ${v.product_type === type ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/60"}`}>
              <span className="block text-lg font-bold">{type === "app" ? "Build an app" : "Build a game"}</span>
              <span className="mt-1 block text-xs text-muted-foreground">{type === "app" ? "SaaS, websites, tools and mobile apps" : "Browser, arcade, puzzle, strategy and more"}</span>
            </button>
          ))}
        </div>

        <section className="mt-5 rounded-xl border border-border bg-card p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold">Coding agent
              <select className={`${inputClass} mt-2`} value={v.coding_agent} onChange={(e) => set("coding_agent", e.target.value)}>{agents.map((agent) => <option key={agent}>{agent}</option>)}</select>
            </label>
            <label className="text-sm font-semibold">Project name (optional)
              <input className={`${inputClass} mt-2`} value={v.project_name} onChange={(e) => set("project_name", e.target.value)} placeholder="e.g. PocketPitch" />
            </label>
            <label className="text-sm font-semibold sm:col-span-2">What should it build? *
              <textarea className={`${inputClass} mt-2 min-h-24`} value={v.core_idea} onChange={(e) => set("core_idea", e.target.value)} placeholder="Describe the product and the problem it solves..." />
            </label>
            <label className="text-sm font-semibold">Who is it for? *
              <textarea className={`${inputClass} mt-2 min-h-20`} value={v.target_audience} onChange={(e) => set("target_audience", e.target.value)} placeholder="Target users and their needs..." />
            </label>
            <label className="text-sm font-semibold">Core features / mechanics *
              <textarea className={`${inputClass} mt-2 min-h-20`} value={v.core_features} onChange={(e) => set("core_features", e.target.value)} placeholder="List the must-have features..." />
            </label>
            {v.product_type === "app" ? (
              <label className="text-sm font-semibold sm:col-span-2">Main screens and user workflows
                <textarea className={`${inputClass} mt-2 min-h-20`} value={v.app_workflows} onChange={(e) => set("app_workflows", e.target.value)} placeholder="Sign-up, dashboard, create/edit flow, settings..." />
              </label>
            ) : (
              <>
                <label className="text-sm font-semibold">Game genre *
                  <input className={`${inputClass} mt-2`} value={v.game_genre} onChange={(e) => set("game_genre", e.target.value)} placeholder="e.g. endless runner, puzzle, racing" />
                </label>
                <label className="text-sm font-semibold">Core gameplay loop
                  <textarea className={`${inputClass} mt-2 min-h-20`} value={v.gameplay_loop} onChange={(e) => set("gameplay_loop", e.target.value)} placeholder="What does the player repeatedly do, earn and unlock?" />
                </label>
              </>
            )}
            <label className="text-sm font-semibold">Platform *
              <input className={`${inputClass} mt-2`} value={v.platform} onChange={(e) => set("platform", e.target.value)} placeholder="Responsive web app, iOS, Android, browser game..." />
            </label>
            <label className="text-sm font-semibold">Visual direction *
              <input className={`${inputClass} mt-2`} value={v.visual_direction} onChange={(e) => set("visual_direction", e.target.value)} placeholder="Minimal, playful, dark, premium..." />
            </label>
            <label className="text-sm font-semibold">Preferred tech stack (optional)
              <input className={`${inputClass} mt-2`} value={v.preferred_stack} onChange={(e) => set("preferred_stack", e.target.value)} placeholder="Leave blank for a recommendation" />
            </label>
            <label className="text-sm font-semibold">Integrations (optional)
              <input className={`${inputClass} mt-2`} value={v.integrations} onChange={(e) => set("integrations", e.target.value)} placeholder="Payments, maps, APIs..." />
            </label>
            <label className="text-sm font-semibold">PromptBase price
              <select className={`${inputClass} mt-2`} value={v.price_target} onChange={(e) => set("price_target", e.target.value)}>{["Free", "$2.99", "$3.99", "$4.99", "$5.99", "$6.99", "$7.99", "$8.99", "$9.99", "$10.99", "$14.99", "$19.99"].map((p) => <option key={p}>{p}</option>)}</select>
            </label>
            <label className="text-sm font-semibold">Build time
              <select className={`${inputClass} mt-2`} value={v.build_time} onChange={(e) => set("build_time", e.target.value)}>{["Under 15 minutes", "15 minutes to 1 hour", "1 to 3 hours", "Over 3 hours", "Not yet tested"].map((t) => <option key={t}>{t}</option>)}</select>
            </label>
          </div>
          <button disabled={!valid || loading} onClick={generate} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 font-bold text-primary-foreground disabled:opacity-40">
            {loading ? <><Loader2 className="size-4 animate-spin" /> Creating your build prompt…</> : <><Sparkles className="size-4" /> Generate Apps & Games listing</>}
          </button>
          {error && <p role="alert" className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">{error}</p>}
        </section>

        {output && <section className="mt-7 rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">Your PromptBase package</h2><button onClick={() => copy(output)} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"><Copy className="size-3.5" /> {copied ? "Copied" : "Copy all"}</button></div>
          <pre className="mt-4 whitespace-pre-wrap break-words text-sm leading-7">{output}</pre>
        </section>}
        <p className="mt-7 rounded-lg border border-border p-4 text-xs text-muted-foreground">A generated prompt is documented, not reproduced. Run it in the selected coding agent, test the actual build, and upload genuine previews before claiming it is verified or submitting it to a marketplace.</p>
      </div>
    </main>
  );
}
