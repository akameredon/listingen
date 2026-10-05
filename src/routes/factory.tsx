import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/factory")({
  head: () => ({
    meta: [
      { title: "Prompt Factory — AI Prompt Generator" },
      { name: "description", content: "Generate unique AI image prompts to test and sell on PromptBase." },
      { property: "og:title", content: "Prompt Factory — AI Prompt Generator" },
      { property: "og:description", content: "Generate unique AI image prompts to test and sell on PromptBase." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Factory,
});

const environments = [
  "floating in deep neon space",
  "hidden inside a glowing mystical forest",
  "navigating a rainy Tokyo street at midnight",
  "perched on top of a candy cloud",
  "submerged in a sunken high-tech city",
];
const details = [
  "cinematic dramatic lighting, 8k resolution",
  "pastel color palette, intricate details",
  "sharp focus, volumetric fog, trending on ArtStation",
  "vivid colors, masterpiece, award-winning composition",
];

const themes: Record<string, { label: string; subjects: string[]; styles: string[] }> = {
  all: {
    label: "Random mix",
    subjects: ["An astronaut kitten", "A legendary cybernetic samurai", "A tiny dragon holding a coffee cup", "A floating steampunk island", "A futuristic racing car", "An ancient wizard owl"],
    styles: ["3D Pixar cartoon style", "80s retro neon cyberpunk", "Ethereal watercolor painting", "Hyper-realistic Unreal Engine 5 render", "Vibrant claymation style", "Minimalist vector line art"],
  },
  cyber: {
    label: "Cyberpunk",
    subjects: ["A cybernetic ninja", "A rogue AI robot", "A futuristic hover-bike racer", "A hacker raccoon"],
    styles: ["80s retro neon cyberpunk style", "gritty dystopian sci-fi cinema style"],
  },
  fantasy: {
    label: "Fantasy",
    subjects: ["A majestic forest elf", "A phoenix rising from ash", "A secret potion shop", "A crystal golem"],
    styles: ["Ethereal magical fantasy illustration", "classic oil painting style"],
  },
  cute: {
    label: "Cute 3D",
    subjects: ["A chubby baby penguin", "A smiling little cloud creature", "A tiny puppy wearing a wizard hat"],
    styles: ["3D cute Pixar animation style", "soft squishy claymation render"],
  },
};

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

function Factory() {
  const [theme, setTheme] = useState("all");
  const [prompt, setPrompt] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const generate = () => {
    const t = themes[theme] ?? themes["all"]!;
    const p = `${pick(t.subjects)}, ${pick(t.styles)}, ${pick(environments)}, ${pick(details)} --v 6.0`;
    setPrompt(p);
    setCopied(false);
    setHistory((h) => [p, ...h].slice(0, 8));
  };

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <main className="min-h-screen bg-background px-5 py-12 text-foreground">
      <a href="/" className="mx-auto mb-6 block max-w-xl font-mono text-xs text-primary">← Listing Generator</a>
      <div className="mx-auto max-w-xl">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">PromptBase toolkit</p>
        <h1 className="mt-2 text-5xl font-black tracking-tight">Prompt Factory</h1>
        <p className="mt-3 text-muted-foreground">Mix subjects, styles and scenes into ready-to-test AI prompts.</p>

        <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Object.entries(themes).map(([k, v]) => (
            <button
              key={k}
              onClick={() => setTheme(k)}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${theme === k ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary"}`}
            >
              {v.label}
            </button>
          ))}
        </div>

        <button
          onClick={generate}
          className="mt-4 w-full rounded-lg bg-accent py-4 text-lg font-black text-accent-foreground transition hover:opacity-90 active:scale-[0.99]"
        >
          Generate prompt
        </button>

        {prompt && (
          <div className="mt-6 rounded-xl border border-primary/40 bg-card p-5">
            <p className="font-mono text-sm leading-relaxed">{prompt}</p>
            <button onClick={() => copy(prompt)} className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              {copied ? "Copied!" : "Copy prompt"}
            </button>
          </div>
        )}

        {history.length > 1 && (
          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Recent</h2>
            <ul className="mt-3 space-y-2">
              {history.slice(1).map((h, i) => (
                <li key={i}>
                  <button onClick={() => copy(h)} className="w-full rounded-md border border-border bg-card p-3 text-left font-mono text-xs text-muted-foreground hover:text-foreground">
                    {h}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-10 rounded-lg border border-border p-4 text-xs text-muted-foreground">
          Reminder: PromptBase requires you to test every prompt in an AI tool and upload real results before selling.
        </p>
      </div>
    </main>
  );
}
