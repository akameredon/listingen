import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { appsGamesInputSchema } from "@/lib/apps-games";
import { APPS_GAMES_SYSTEM_PROMPT, buildAppsGamesUserMessage } from "@/lib/apps-games-prompt.server";
import { geminiGenerate, verifyBearer } from "@/lib/gemini.server";

const bodySchema = z.object({ input: appsGamesInputSchema });

export const Route = createFileRoute("/api/apps-games")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!(await verifyBearer(request))) return new Response("Please sign in again.", { status: 401 });
        let body;
        try {
          body = bodySchema.parse(await request.json());
        } catch {
          return new Response("Please complete the required app/game details.", { status: 400 });
        }
        try {
          const output = await geminiGenerate({
            system: APPS_GAMES_SYSTEM_PROMPT,
            user: buildAppsGamesUserMessage(body.input),
          });
          return new Response(output, {
            headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Generation failed. Please try again.";
          return new Response(message, { status: 502 });
        }
      },
    },
  },
});
