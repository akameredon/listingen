import { supabase } from "@/integrations/supabase/client";
import type { ListingInput } from "./listing";
import { splitSections } from "./listing";

/** Streams a listing from the server route; calls onChunk with the growing text. */
export async function streamListing(
  input: ListingInput,
  opts: { signal?: AbortSignal; onChunk?: (all: string) => void; revise?: { previous: string; fixes: string[] } } = {},
): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch("/api/listing", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ input, revise: opts.revise }),
    signal: opts.signal,
  });
  if (!res.ok || !res.body) {
    const raw = (await res.text().catch(() => "")).trim();
    const looksHtml = raw.startsWith("<") || raw.length > 300;
    throw new Error(
      looksHtml || !raw ? "The server was briefly unavailable. Please try again in a few seconds." : raw,
    );
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let all = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    all += dec.decode(value, { stream: true });
    opts.onChunk?.(all);
  }
  if (!all.trim()) throw new Error("The AI returned an empty answer. Please try again.");
  return all;
}

export function extractMeta(output: string) {
  const s = splitSections(output);
  const titleBody = s.find((x) => x.n === 1)?.body ?? "";
  const firstTitle =
    titleBody
      .split("\n")
      .map((l) => l.replace(/^[\s>*\-\d.)#]+/, "").replace(/\*\*/g, "").replace(/^["“]|["”]$/g, "").trim())
      .find((l) => l.length > 3) ?? "Untitled listing";
  const template = s.find((x) => x.n === 4)?.body.replace(/^```\w*\n?|```$/g, "").trim() ?? "";
  const examples = s.find((x) => x.n === 5)?.body ?? "";
  return { title: firstTitle.slice(0, 120), template, examples };
}

/** Word-trigram Jaccard similarity (0..1) for duplicate detection. */
function shingles(t: string) {
  const w = t.toLowerCase().replace(/\[[^\]]*\]/g, " var ").replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  const set = new Set<string>();
  for (let i = 0; i + 2 < w.length; i++) set.add(`${w[i]} ${w[i + 1]} ${w[i + 2]}`);
  return set;
}
export function similarity(a: string, b: string) {
  const A = shingles(a);
  const B = shingles(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}

export type Dup = { id: string; title: string; sim: number };
export function findDuplicate(
  template: string,
  others: { id: string; title: string; template: string }[],
  selfId?: string,
): Dup | null {
  let best: Dup | null = null;
  for (const o of others) {
    if (o.id === selfId || !o.template) continue;
    const sim = similarity(template, o.template);
    if (!best || sim > best.sim) best = { id: o.id, title: o.title, sim };
  }
  return best && best.sim >= 0.35 ? best : null;
}

/** Turns example N's variable values into a ready-to-run image prompt. */
export function fillExample(template: string, examples: string, n: number): string | null {
  const blocks = examples.split(/\n(?=\s*(?:\*\*)?(?:Example\s*)?\d+[.):])/i).filter((b) => /\[[^\]]+\]\s*:/.test(b));
  const block = blocks[n];
  if (!block) return null;
  const values: Record<string, string> = {};
  for (const m of block.matchAll(/\[([^\]]+)\]\s*:\s*(.+)/g)) values[m[1]!.trim().toLowerCase()] = m[2]!.replace(/\*\*/g, "").trim();
  return template.replace(/\[([^\]]+)\]/g, (all, k: string) => values[k.trim().toLowerCase()] ?? all);
}
