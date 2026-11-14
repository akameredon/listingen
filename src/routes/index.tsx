import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";\nimport { streamListing } from "@/lib/listing-client";\nimport { saveListing } from "@/lib/marketplace-client";
import { Check, Copy, Loader2, Sparkles, ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import {
  STEPS,
  SECTION_TITLES,
  emptyInput,
  splitSections,
  type Field,
  type ListingInput,
} from "@/lib/listing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Listingen — Create, Verify & Sell AI Prompts" },
      {
        name: "description",
        content:
          "Create AI prompts, prepare marketplace products, and build a creator business with quality and verification controls.",
      },
      { property: "og:title", content: "PromptBase Pro Listing Generator" },
      {
        property: "og:description",
        content: "Answer a few guided questions and get a copy-paste-ready, guideline-compliant PromptBase listing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const inputCls =
  "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/30";

function FieldInput({
  f,
  value,
  onChange,
}: {
  f: Field;
  value: string;
  onChange: (v: string) => void;
}) {
  if (f.kind === "select")
    return (
      <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Choose…</option>
        {f.options?.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  if (f.kind === "short")
    return (
      <input className={inputCls} value={value} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} />
    );
  return (
    <textarea
      className={`${inputCls} min-h-28 resize-y`}
      value={value}
      placeholder={f.placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function CopyBtn({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
    >
      {done ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {done ? "Copied" : label}
    </button>
  );
}

function Index() {
  const [step, setStep] = useState(0);
  const [v, setV] = useState<ListingInput>(emptyInput);
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<"form" | "result">("form");\n  const [saving, setSaving] = useState(false);\n  const [saved, setSaved] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const current = STEPS[step]!;
  const visible = current.fields.filter((f) => !f.showIf || f.showIf(v));
  const valid = visible.every((f) => !f.required || v[f.key].trim());

  const generate = async () => {
    setPhase("result");
    setOutput("");
    setError("");
    setLoading(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const result = await streamListing(v, {
        signal: ctrl.signal,
        onChunk: (all) => setOutput(all),
      });
      if (!result.trim()) throw new Error("The AI returned an empty answer. Please try again.");
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const saveCurrentListing = async () => {
    setSaving(true);
    setError("");
    try {
      await saveListing(v, output);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save this prompt. Sign in and try again.");
    } finally {
      setSaving(false);
    }
  };

  const sections = useMemo(() => splitSections(output), [output]);

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6">
      <div className="mx-auto max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">PromptBase seller tool</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">Listing Generator</h1>
        <p className="mt-3 text-muted-foreground">
          Answer a few guided questions. Get a complete, guideline-compliant listing you can paste into PromptBase in
          under two minutes.
        </p>

        <section className="mt-6 rounded-xl border border-primary/40 bg-primary/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">New generator</p>
              <h2 className="mt-1 text-lg font-bold">Creating an app or game?</h2>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">Generate agent-specific build prompts for Claude Code, Google Antigravity, Codex and Cursor Agent, plus a PromptBase-ready listing.</p>
            </div>
            <Link to="/apps-games" className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90">Explore Apps & Games →</Link>
          </div>
        </section>
        {phase === "form" && (
          <section className="mt-8">
            <div className="flex gap-1.5">
              {STEPS.map((s, i) => (
                <button
                  key={s.title}
                  aria-label={`Step ${i + 1}: ${s.title}`}
                  onClick={() => i < step && setStep(i)}
                  className={`h-1.5 flex-1 rounded-full transition ${i <= step ? "bg-primary" : "bg-muted"}`}
                />
              ))}
            </div>
            <p className="mt-4 font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Step {step + 1} of {STEPS.length} · {current.blurb}
            </p>
            <h2 className="mt-1 text-2xl font-bold">{current.title}</h2>

            <div className="mt-5 space-y-5 rounded-xl border border-border bg-card p-5">
              {visible.map((f) => (
                <div key={f.key}>
                  <label className="mb-2 block text-sm font-medium">
                    {f.label}
                    {f.required && <span className="ml-1 text-accent">*</span>}
                  </label>
                  <FieldInput f={f} value={v[f.key]} onChange={(val) => setV((p) => ({ ...p, [f.key]: val }))} />
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between">
              <button
                disabled={step === 0}
                onClick={() => setStep((s) => s - 1)}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold transition hover:border-primary disabled:opacity-30"
              >
                <ArrowLeft className="size-4" /> Back
              </button>
              {step < STEPS.length - 1 ? (
                <button
                  disabled={!valid}
                  onClick={() => setStep((s) => s + 1)}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
                >
                  Next <ArrowRight className="size-4" />
                </button>
              ) : (
                <button
                  disabled={!valid}
                  onClick={generate}
                  className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-black text-accent-foreground transition hover:opacity-90 disabled:opacity-40"
                >
                  <Sparkles className="size-4" /> Generate listing
                </button>
              )}
            </div>
          </section>
        )}

        {phase === "result" && (
          <section className="mt-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-bold">Your listing</h2>
              <div className="flex gap-2">
                {output && !loading && <CopyBtn text={output} label="Copy all" />}
                {output && !loading && !saved && <button onClick={saveCurrentListing} disabled={saving} className="rounded-md border border-primary px-3 py-1.5 text-xs font-semibold text-primary disabled:opacity-50">{saving ? "Saving…" : "Save to Creator Studio"}</button>}
                {saved && <span className="self-center text-xs font-semibold text-primary">Saved to your library</span>}
                <button
                  onClick={() => {
                    abortRef.current?.abort();
                    setPhase("form");
                    setLoading(false);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:border-primary"
                >
                  <RotateCcw className="size-3.5" /> Edit answers
                </button>
              </div>
            </div>

            {loading && (
              <p className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Writing your listing…
              </p>
            )}

            {error && (
              <div className="mt-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm">
                <p className="font-semibold">Couldn't generate the listing</p>
                <p className="mt-1 text-muted-foreground">{error}</p>
                <button
                  onClick={generate}
                  className="mt-3 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                >
                  Try again
                </button>
              </div>
            )}

            <div className="mt-5 space-y-4">
              {sections.map((s) => (
                <article key={s.n} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-primary">
                      {s.n}. {SECTION_TITLES[s.n - 1] ?? s.heading}
                    </h3>
                    <CopyBtn text={s.body} />
                  </div>
                  <div className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90">
                    {s.body}
                  </div>
                </article>
              ))}
            </div>

            {!loading && output && (
              <button
                onClick={generate}
                className="mt-6 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:border-primary"
              >
                <Sparkles className="size-4" /> Regenerate
              </button>
            )}
          </section>
        )}

        <p className="mt-10 rounded-lg border border-border p-4 text-xs text-muted-foreground">
          Reminder: PromptBase requires you to test every prompt in an AI tool and upload real results before selling.
          <a href="/factory" className="ml-1 text-primary underline">
            Need quick image-prompt ideas? Try the Prompt Factory.
          </a>
        </p>
      </div>
    </main>
  );
}
