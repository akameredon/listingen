import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
function hex(bytes: Uint8Array) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
async function verifySignature(raw: Uint8Array, signature: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, raw));
  return constantTimeEqual(hex(digest), signature.toLowerCase());
}
function dbClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Supabase server credentials are unavailable.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
function duplicate(error: { code?: string } | null) {
  return error?.code === "23505";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok");
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  try {
    const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
    const signature = req.headers.get("x-paystack-signature") ?? "";
    if (!secret || !signature) return json({ error: "Webhook authentication is not configured." }, 503);
    const raw = new Uint8Array(await req.arrayBuffer());
    if (!await verifySignature(raw, signature, secret)) return json({ error: "Invalid webhook signature." }, 401);
    const eventBody = JSON.parse(new TextDecoder().decode(raw));
    const event = String(eventBody?.event ?? "");
    const data = eventBody?.data ?? {};
    const db = dbClient();
    const reference = String(data?.reference ?? data?.transaction?.reference ?? "");
    const eventIdentity = String(data?.id ?? data?.transfer_code ?? data?.reference ?? crypto.randomUUID());
    const providerEventId = `${event}:${eventIdentity}`;

    const { data: existing } = await db.from("payment_events").select("id").eq("provider_event_id", providerEventId).maybeSingle();
    if (existing) return json({ received: true, duplicate: true });

    if (event === "charge.success") {
      if (!reference) return json({ error: "Missing payment reference." }, 400);
      const { data: purchase, error: purchaseError } = await db.from("purchases")
        .select("id,status,total_amount,currency").eq("provider", "paystack").eq("provider_checkout_id", reference).single();
      if (purchaseError || !purchase) return json({ error: "Purchase reference not found." }, 404);
      if (Number(data.amount) !== purchase.total_amount || String(data.currency).toUpperCase() !== purchase.currency.toUpperCase()) {
        return json({ error: "Provider amount or currency does not match the purchase." }, 409);
      }
      if (purchase.status !== "paid") {
        const { error: paidError } = await db.from("purchases").update({
          status: "paid", provider_payment_id: String(data.id ?? reference), paid_at: new Date().toISOString(),
        }).eq("id", purchase.id);
        if (paidError) return json({ error: "Could not finalize purchase record." }, 500);
      }
      const { data: items, error: itemsError } = await db.from("purchase_items")
        .select("id,creator_id,creator_amount,platform_amount,currency,commission_rule_id")
        .eq("purchase_id", purchase.id);
      if (itemsError || !items?.length) return json({ error: "Purchase items are missing." }, 500);
      for (const item of items) {
        if (Number(item.creator_amount) > 0) {
          const { error } = await db.from("ledger_entries").insert({
            purchase_item_id: item.id, user_id: item.creator_id, entry_type: "sale_credit",
            amount: item.creator_amount, currency: item.currency, commission_rule_id: item.commission_rule_id,
            description: "Verified marketplace sale credit",
          });
          if (error && !duplicate(error)) return json({ error: "Could not record creator earnings." }, 500);
        }
        if (Number(item.platform_amount) > 0) {
          const { error } = await db.from("platform_revenue_entries").insert({
            purchase_item_id: item.id, entry_type: "platform_fee", amount: item.platform_amount,
            currency: item.currency, commission_rule_id: item.commission_rule_id,
            description: "Verified marketplace platform fee",
          });
          if (error && !duplicate(error)) return json({ error: "Could not record platform revenue." }, 500);
        }
      }
    } else if (event === "charge.failed") {
      if (reference) await db.from("purchases").update({ status: "failed" }).eq("provider", "paystack").eq("provider_checkout_id", reference).eq("status", "pending");
    } else if (event === "refund.processed") {
      if (!reference) return json({ error: "Missing refund reference." }, 400);
      const { data: purchase, error: purchaseError } = await db.from("purchases")
        .select("id,total_amount,currency").eq("provider", "paystack").eq("provider_checkout_id", reference).single();
      if (purchaseError || !purchase) return json({ error: "Refund purchase not found." }, 404);
      if (Number(data.amount) !== purchase.total_amount) return json({ error: "Partial refunds require manual reconciliation in this release." }, 409);
      const { data: items, error: itemsError } = await db.from("purchase_items")
        .select("id,creator_id,creator_amount,platform_amount,currency,commission_rule_id")
        .eq("purchase_id", purchase.id);
      if (itemsError || !items?.length) return json({ error: "Purchase items are missing." }, 500);
      for (const item of items) {
        if (Number(item.creator_amount) > 0) {
          const { error } = await db.from("ledger_entries").insert({
            purchase_item_id: item.id, user_id: item.creator_id, entry_type: "refund_debit",
            amount: -Number(item.creator_amount), currency: item.currency, commission_rule_id: item.commission_rule_id,
            description: "Full purchase refund reversal",
          });
          if (error && !duplicate(error)) return json({ error: "Could not reverse creator earnings." }, 500);
        }
        if (Number(item.platform_amount) > 0) {
          const { error } = await db.from("platform_revenue_entries").insert({
            purchase_item_id: item.id, entry_type: "refund_reversal", amount: -Number(item.platform_amount),
            currency: item.currency, commission_rule_id: item.commission_rule_id,
            description: "Full purchase refund reversal",
          });
          if (error && !duplicate(error)) return json({ error: "Could not reverse platform revenue." }, 500);
        }
      }
      await db.from("purchases").update({ status: "refunded" }).eq("id", purchase.id);
    } else if (event === "transfer.success" || event === "transfer.failed") {
      const transferCode = String(data.transfer_code ?? "");
      if (!transferCode) return json({ error: "Missing transfer code." }, 400);
      const { data: payout, error: payoutError } = await db.from("payout_requests")
        .select("id,user_id,amount,currency,status").eq("provider_transfer_ref", transferCode).single();
      if (payoutError || !payout) return json({ error: "Payout transfer reference not found." }, 404);
      if (event === "transfer.success") {
        await db.from("payout_requests").update({ status: "paid", processed_at: new Date().toISOString() }).eq("id", payout.id);
        const { error } = await db.from("ledger_entries").insert({
          payout_request_id: payout.id, user_id: payout.user_id, entry_type: "payout_debit",
          amount: -Number(payout.amount), currency: payout.currency, description: "Verified creator payout",
        });
        if (error && !duplicate(error)) return json({ error: "Could not record payout debit." }, 500);
      } else {
        await db.from("payout_requests").update({ status: "failed", admin_note: "Paystack reported transfer failure." }).eq("id", payout.id);
      }
    } else {
      return json({ received: true, ignored: true });
    }

    const { error: eventError } = await db.from("payment_events").insert({
      provider: "paystack", provider_event_id: providerEventId, event_type: event,
      payload_hash: hex(new Uint8Array(await crypto.subtle.digest("SHA-256", raw))),
    });
    if (eventError && !duplicate(eventError)) return json({ error: "Could not record webhook event." }, 500);
    return json({ received: true });
  } catch (error) {
    console.error("paystack-webhook", error);
    return json({ error: "Webhook processing failed." }, 500);
  }
});
