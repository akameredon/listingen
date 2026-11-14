import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const configured = Deno.env.get("LISTINGEN_SITE_URL") ?? "";
  const allowed = origin === configured || origin.endsWith(".vercel.app") || /^http:\/\/localhost(?::\d+)?$/.test(origin);
  return {
    "Access-Control-Allow-Origin": allowed ? origin : (configured || "null"),
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "Content-Type": "application/json",
  };
}
function reply(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(req) });
}
function serviceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Supabase server credentials are unavailable.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
async function authenticatedUser(req: Request) {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_ANON_KEY");
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!url || !key || !token) return null;
  const client = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(token);
  return error ? null : data.user;
}

async function initializeCheckout(req: Request, body: Record<string, unknown>, user: { id: string; email?: string }) {
  const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
  const configuredSite = Deno.env.get("LISTINGEN_SITE_URL");
  const origin = req.headers.get("origin") ?? "";
  const siteUrl = configuredSite || (origin.endsWith(".vercel.app") || /^http:\/\/localhost(?::\d+)?$/.test(origin) ? origin : "");
  if (!secret || !siteUrl) return reply(req, { error: "Paystack payment configuration is incomplete." }, 503);
  const productId = typeof body.productId === "string" ? body.productId : "";
  if (!productId) return reply(req, { error: "A product is required." }, 400);
  if (!user.email) return reply(req, { error: "Your account needs an email address before checkout." }, 400);
  const db = serviceClient();
  const { data: product, error: productError } = await db.from("marketplace_products")
    .select("id,creator_id,title,price_amount,currency,current_version_id,status")
    .eq("id", productId).eq("status", "published").single();
  if (productError || !product) return reply(req, { error: "This product is not available for purchase." }, 404);
  if (product.creator_id === user.id) return reply(req, { error: "You cannot purchase your own product." }, 400);
  if (!product.current_version_id || product.price_amount <= 0) return reply(req, { error: "This product is not eligible for paid checkout." }, 409);
  const now = new Date().toISOString();
  const { data: rule, error: ruleError } = await db.from("commission_rules")
    .select("id,platform_fee_bps,creator_share_bps")
    .eq("currency", product.currency).eq("is_active", true)
    .lte("effective_from", now).is("effective_until", null).maybeSingle();
  if (ruleError || !rule || rule.platform_fee_bps == null || rule.creator_share_bps == null) {
    return reply(req, { error: "A commission rule has not been configured for this currency." }, 409);
  }
  const total = product.price_amount;
  const platformAmount = Math.round(total * rule.platform_fee_bps / 10000);
  const creatorAmount = total - platformAmount;
  const reference = `LISTINGEN_${crypto.randomUUID().replaceAll("-", "")}`;
  const { data: purchase, error: purchaseError } = await db.from("purchases").insert({
    buyer_id: user.id, provider: "paystack", provider_checkout_id: reference,
    status: "pending", currency: product.currency, subtotal_amount: total,
    platform_fee_amount: platformAmount, total_amount: total,
  }).select("id").single();
  if (purchaseError || !purchase) return reply(req, { error: "Could not create a purchase record." }, 500);
  const { error: itemError } = await db.from("purchase_items").insert({
    purchase_id: purchase.id, product_id: product.id, version_id: product.current_version_id,
    creator_id: product.creator_id, product_title_snapshot: product.title,
    unit_amount: total, creator_amount: creatorAmount, platform_amount: platformAmount,
    currency: product.currency, commission_rule_id: rule.id,
  });
  if (itemError) {
    await db.from("purchases").update({ status: "failed" }).eq("id", purchase.id);
    return reply(req, { error: "Could not create purchase item." }, 500);
  }
  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: user.email, amount: total, currency: product.currency, reference,
      callback_url: `${siteUrl.replace(/\/$/, "")}/payment/return`,
      metadata: { purchase_id: purchase.id, product_id: product.id, buyer_id: user.id },
    }),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.status || !result?.data?.authorization_url) {
    await db.from("purchases").update({ status: "failed" }).eq("id", purchase.id);
    return reply(req, { error: result?.message ?? "Paystack could not initialize checkout." }, 502);
  }
  return reply(req, { authorization_url: result.data.authorization_url, reference, purchase_id: purchase.id });
}

async function requestPayout(req: Request, body: Record<string, unknown>, user: { id: string }) {
  const amount = Number(body.amount);
  const payoutAccountId = typeof body.payoutAccountId === "string" ? body.payoutAccountId : "";
  const currency = typeof body.currency === "string" ? body.currency.toUpperCase() : "";
  if (!Number.isSafeInteger(amount) || amount <= 0 || !payoutAccountId || !currency) {
    return reply(req, { error: "Enter a valid payout amount, currency and verified payout account." }, 400);
  }
  const db = serviceClient();
  const { data: account, error: accountError } = await db.from("payout_accounts")
    .select("id,status,provider").eq("id", payoutAccountId).eq("user_id", user.id).single();
  if (accountError || !account || account.status !== "verified" || account.provider !== "paystack") {
    return reply(req, { error: "Choose a verified Paystack payout account." }, 409);
  }
  const { data: entries, error: ledgerError } = await db.from("ledger_entries")
    .select("amount,currency").eq("user_id", user.id).eq("currency", currency);
  if (ledgerError) return reply(req, { error: "Could not verify your available earnings." }, 500);
  const available = (entries ?? []).reduce((sum, entry) => sum + Number(entry.amount), 0);
  if (amount > available) return reply(req, { error: "The requested payout exceeds your available earnings balance." }, 409);
  const { data: payout, error: payoutError } = await db.from("payout_requests").insert({
    user_id: user.id, payout_account_id: payoutAccountId, amount, currency, status: "requested",
  }).select("id,status,amount,currency,requested_at").single();
  if (payoutError) return reply(req, { error: "Could not create payout request." }, 500);
  return reply(req, { payout, available_balance: available - amount });
}

async function executePayout(req: Request, body: Record<string, unknown>, user: { id: string; app_metadata?: Record<string, unknown> }) {
  if (user.app_metadata?.role !== "admin") return reply(req, { error: "Administrator access is required." }, 403);
  const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!secret) return reply(req, { error: "Paystack transfers are not configured." }, 503);
  const payoutId = typeof body.payoutId === "string" ? body.payoutId : "";
  if (!payoutId) return reply(req, { error: "A payout request is required." }, 400);
  const db = serviceClient();
  const { data: payout, error } = await db.from("payout_requests")
    .select("id,user_id,amount,currency,status,payout_accounts(provider,provider_account_ref,status)")
    .eq("id", payoutId).single();
  if (error || !payout || payout.status !== "requested") return reply(req, { error: "Payout request is not eligible for processing." }, 409);
  const account = payout.payout_accounts as { provider?: string; provider_account_ref?: string; status?: string } | null;
  if (account?.provider !== "paystack" || account.status !== "verified" || !account.provider_account_ref) {
    return reply(req, { error: "A verified Paystack transfer recipient is required." }, 409);
  }
  const reference = `LISTINGEN_PAYOUT_${payout.id}`;
  const response = await fetch("https://api.paystack.co/transfer", {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({ source: "balance", amount: payout.amount, recipient: account.provider_account_ref, reason: "Listingen creator earnings payout", reference }),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.status || !result?.data?.transfer_code) {
    await db.from("payout_requests").update({ status: "failed", admin_note: result?.message ?? "Transfer initialization failed." }).eq("id", payout.id);
    return reply(req, { error: result?.message ?? "Could not initialize payout transfer." }, 502);
  }
  const { error: updateError } = await db.from("payout_requests").update({
    status: "processing", provider_transfer_ref: result.data.transfer_code, admin_note: "Transfer submitted to Paystack.",
  }).eq("id", payout.id);
  if (updateError) return reply(req, { error: "Transfer started but payout record could not be updated; reconcile with Paystack before retrying." }, 500);
  return reply(req, { payout_id: payout.id, status: "processing", transfer_code: result.data.transfer_code });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return reply(req, { error: "Method not allowed." }, 405);
  try {
    const user = await authenticatedUser(req);
    if (!user) return reply(req, { error: "Sign in to continue." }, 401);
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    if (body.action === "initialize_checkout") return await initializeCheckout(req, body, user);
    if (body.action === "request_payout") return await requestPayout(req, body, user);
    if (body.action === "execute_payout") return await executePayout(req, body, user);
    return reply(req, { error: "Unknown finance action." }, 400);
  } catch (error) {
    console.error("marketplace-finance", error);
    return reply(req, { error: "An unexpected finance operation error occurred." }, 500);
  }
});
