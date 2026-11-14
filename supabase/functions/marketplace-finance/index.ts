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

async function claimFree(req: Request, body: Record<string, unknown>, user: { id: string }) {
  const productId = typeof body.productId === "string" ? body.productId : "";
  if (!productId) return reply(req, { error: "A product is required." }, 400);
  const db = serviceClient();
  const { data: product, error } = await db.from("marketplace_products").select("id,creator_id,title,price_amount,currency,current_version_id,status").eq("id", productId).eq("status", "published").single();
  if (error || !product) return reply(req, { error: "This product is not available." }, 404);
  if (product.creator_id === user.id) return reply(req, { error: "You cannot claim your own product." }, 400);
  if (product.price_amount !== 0 || !product.current_version_id) return reply(req, { error: "This product is not a free product." }, 409);
  const reference = `LISTINGEN_FREE_${crypto.randomUUID().replaceAll("-", "")}`;
  const { data: purchase, error: purchaseError } = await db.from("purchases").insert({buyer_id:user.id,provider:"free",provider_checkout_id:reference,status:"paid",currency:product.currency,subtotal_amount:0,platform_fee_amount:0,total_amount:0,paid_at:new Date().toISOString()}).select("id").single();
  if (purchaseError || !purchase) return reply(req, { error: "Could not record free product claim." }, 500);
  const { error: itemError } = await db.from("purchase_items").insert({purchase_id:purchase.id,product_id:product.id,version_id:product.current_version_id,creator_id:product.creator_id,product_title_snapshot:product.title,unit_amount:0,creator_amount:0,platform_amount:0,currency:product.currency});
  if (itemError) { await db.from("purchases").update({status:"failed"}).eq("id",purchase.id); return reply(req,{error:"Could not deliver free product."},500); }
  return reply(req,{purchase_id:purchase.id,reference,status:"paid"});
}

async function requestPayout(req: Request, body: Record<string, unknown>, user: { id: string }) {
  const amount = Number(body.amount);
  const payoutAccountId = typeof body.payoutAccountId === "string" ? body.payoutAccountId : "";
  const currency = typeof body.currency === "string" ? body.currency.toUpperCase() : "";
  if (!Number.isSafeInteger(amount) || amount <= 0 || !payoutAccountId || !currency) {
    return reply(req, { error: "Enter a valid payout amount, currency and verified payout account." }, 400);
  }
  const db = serviceClient();
  const { data, error } = await db.rpc("request_creator_payout", {
    p_user_id: user.id,
    p_payout_account_id: payoutAccountId,
    p_amount: amount,
    p_currency: currency,
  });
  if (error) return reply(req, { error: error.message.includes("exceeds available") ? error.message : "Could not reserve this payout request. Check your verified account and available balance." }, 409);
  const payout = Array.isArray(data) ? data[0] : data;
  return reply(req, { payout, available_balance: payout?.available_balance ?? 0 });
}

async function verifyPayoutAccount(req: Request, body: Record<string, unknown>, user: { id: string; app_metadata?: Record<string, unknown> }) {
  if (user.app_metadata?.role !== "admin") return reply(req, { error: "Administrator access is required." }, 403);
  const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!secret) return reply(req, { error: "Paystack recipient verification is not configured." }, 503);
  const accountId = typeof body.accountId === "string" ? body.accountId : "";
  if (!accountId) return reply(req, { error: "A payout account is required." }, 400);
  const db = serviceClient();
  const { data: account, error } = await db.from("payout_accounts")
    .select("id,provider,provider_account_ref,status,metadata").eq("id", accountId).single();
  if (error || !account || account.provider !== "paystack" || !account.provider_account_ref) {
    return reply(req, { error: "Paystack recipient reference was not found." }, 404);
  }
  const response = await fetch(`https://api.paystack.co/transferrecipient/${encodeURIComponent(account.provider_account_ref)}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.status || !result?.data) {
    return reply(req, { error: result?.message ?? "Paystack could not verify this recipient." }, 409);
  }
  const details = result.data.details ?? {};
  const accountNumber = String(details.account_number ?? "");
  const safeMetadata = {
    ...(account.metadata ?? {}),
    verified_at: new Date().toISOString(),
    recipient_type: result.data.type ?? null,
    recipient_currency: result.data.currency ?? null,
    bank_name: details.bank_name ?? null,
    account_last4: accountNumber.slice(-4) || null,
  };
  const { error: updateError } = await db.from("payout_accounts")
    .update({ status: "verified", metadata: safeMetadata }).eq("id", account.id);
  if (updateError) return reply(req, { error: "Paystack recipient verified but account status could not be saved." }, 500);
  return reply(req, { account_id: account.id, status: "verified", bank_name: details.bank_name ?? null, account_last4: accountNumber.slice(-4) || null });
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
    if (body.action === "claim_free") return await claimFree(req, body, user);
    if (body.action === "request_payout") return await requestPayout(req, body, user);
    if (body.action === "verify_payout_account") return await verifyPayoutAccount(req, body, user);
    if (body.action === "execute_payout") return await executePayout(req, body, user);
    return reply(req, { error: "Unknown finance action." }, 400);
  } catch (error) {
    console.error("marketplace-finance", error);
    return reply(req, { error: "An unexpected finance operation error occurred." }, 500);
  }
});
