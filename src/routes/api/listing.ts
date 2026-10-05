import { createFileRoute } from "@tanstack/react-router";
import { listingInputSchema } from "@/lib/listing";
import { SYSTEM_PROMPT, buildUserMessage } from "@/lib/listing-prompt.server";

const MODEL = "gemini-2.5-flash";

export const Route = createFileRoute("/api/listing")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["GEMINI_API_KEY"];
        if (!apiKey) return new Response("Gemini key is not configured.", { status: 500 });

        let input;
        try {
          input = listingInputSchema.parse(await request.json());
        } catch {
          return new Response("Please fill in all required fields.", { status: 400 });
        }

        const upstream = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:streamGenerateContent?alt=sse`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
              contents: [{ role: "user", parts: [{ text: buildUserMessage(input) }] }],
              generationConfig: { thinkingConfig: { thinkingBudget: 0 } },
            }),
            signal: request.signal,
          },
        );

        if (!upstream.ok || !upstream.body) {
          const detail = await upstream.text().catch(() => "");
          let msg = `Gemini error (${upstream.status})`;
          try {
            msg = JSON.parse(detail)?.error?.message ?? msg;
          } catch {
            /* keep default */
          }
          return new Response(msg, { status: upstream.status === 429 ? 429 : 502 });
        }

        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        const reader = upstream.body.getReader();
        let buffer = "";

        const stream = new ReadableStream<Uint8Array>({
          async pull(controller) {
            const { done, value } = await reader.read();
            if (done) return controller.close();
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const l of lines) {
              if (!l.startsWith("data:")) continue;
              try {
                const json = JSON.parse(l.slice(5).trim());
                const parts = json?.candidates?.[0]?.content?.parts ?? [];
                for (const p of parts) if (typeof p.text === "string") controller.enqueue(encoder.encode(p.text));
              } catch {
                /* ignore partial line */
              }
            }
          },
          cancel() {
            reader.cancel();
          },
        });

        return new Response(stream, {
          headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
        });
      },
    },
  },
});
