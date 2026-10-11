import { createClient } from "@supabase/supabase-js";

export const TEXT_MODEL = "gemini-3.8-flash";
export const IMAGE_MODEL = "gemini-3.1-flash-image";
const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export class AiError extends Error {
  constructor(message: string, public status = 502) {
    super(message);
  }
}

function key() {
  const k = process.env["GEMINI_API_KEY"];
  if (!k) throw new AiError("Gemini key is not configured.", 500);
  return k;
}

async function readError(res: Response) {
  const detail = await res.text().catch(() => "");
  try {
    return JSON.parse(detail)?.error?.message ?? `Gemini error (${res.status})`;
  } catch {
    return `Gemini error (${res.status})`;
  }
}

/** One-shot text/JSON call. Pass `schema` for structured JSON output. */
export async function geminiGenerate(opts: {
  system: string;
  user: string;
  schema?: unknown;
  search?: boolean;
}): Promise<string> {
  const body: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: opts.system }] },
    contents: [{ role: "user", parts: [{ text: opts.user }] }],
    generationConfig: {
      thinkingConfig: { thinkingBudget: 0 },
      ...(opts.schema ? { responseMimeType: "application/json", responseSchema: opts.schema } : {}),
    },
  };
  if (opts.search) body["tools"] = [{ google_search: {} }];
  const res = await fetch(`${BASE}/${TEXT_MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key() },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new AiError(await readError(res), res.status === 429 ? 429 : 502);
  const json = await res.json();
  const parts = json?.candidates?.[0]?.content?.parts ?? [];
  const text = parts.map((p: { text?: string }) => p.text ?? "").join("");
  if (!text) throw new AiError("The AI returned an empty answer. Please try again.");
  return text;
}

export function parseJson<T>(text: string): T {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  const start = cleaned.search(/[[{]/);
  return JSON.parse(start > 0 ? cleaned.slice(start) : cleaned) as T;
}

export async function geminiImage(prompt: string): Promise<string> {
  const res = await fetch(`${BASE}/${IMAGE_MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key() },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["IMAGE"] },
    }),
  });
  if (!res.ok) throw new AiError(await readError(res), res.status === 429 ? 429 : 502);
  const json = await res.json();
  const parts = json?.candidates?.[0]?.content?.parts ?? [];
  const img = parts.find((p: { inlineData?: { data: string } }) => p.inlineData?.data);
  if (!img) throw new AiError("No image came back. The prompt may have been refused — try different example values.");
  return `data:${img.inlineData.mimeType ?? "image/png"};base64,${img.inlineData.data}`;
}

/** Verifies the bearer token on raw server routes. Returns the user id or null. */
export async function verifyBearer(request: Request): Promise<string | null> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token || token.split(".").length !== 3) return null;
  const url = process.env["SUPABASE_URL"];
  const pk = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !pk) return null;
  const sb = createClient(url, pk, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await sb.auth.getClaims(token);
  return error ? null : ((data?.claims?.sub as string | undefined) ?? null);
}
