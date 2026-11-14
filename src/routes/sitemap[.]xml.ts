import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

function xml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const [products, creators] = await Promise.all([
          supabase.from("marketplace_products").select("slug,updated_at").eq("status", "published").order("updated_at", { ascending: false }).limit(5000),
          supabase.from("creator_profiles").select("slug,updated_at").eq("is_public", true).order("updated_at", { ascending: false }).limit(5000),
        ]);
        if (products.error || creators.error) {
          return new Response("Sitemap temporarily unavailable.", { status: 503, headers: { "Cache-Control": "no-store" } });
        }
        const entries = [
          { path: "/", updated: null as string | null },
          { path: "/marketplace", updated: null },
          ...(products.data ?? []).map(p => ({ path: "/product/" + p.slug, updated: p.updated_at })),
          ...(creators.data ?? []).map(c => ({ path: "/creators/" + c.slug, updated: c.updated_at })),
        ];
        const urls = entries.map(entry => "<url><loc>" + xml(origin + entry.path) + "</loc>" +
          (entry.updated ? "<lastmod>" + new Date(entry.updated).toISOString() + "</lastmod>" : "") + "</url>").join("\n");
        const body = '<?xml version="1.0" encoding="UTF-8"?>\n' +
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + "\n</urlset>";
        return new Response(body, {
          headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600, s-maxage=3600" },
        });
      },
    },
  },
});
