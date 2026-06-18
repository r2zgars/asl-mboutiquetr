import { createHmac } from "node:crypto";

const endpoint = "https://www.paytr.com/odeme/api/get-token";

export function isPaytrConfigured() {
  return Boolean(process.env.PAYTR_MERCHANT_ID && process.env.PAYTR_MERCHANT_KEY && process.env.PAYTR_MERCHANT_SALT);
}

export function paytrPublicConfig() {
  return {
    enabled: isPaytrConfigured(),
    testMode: String(process.env.PAYTR_TEST_MODE ?? "1") === "1"
  };
}

export function getClientIp(request) {
  const forwarded = String(request.headers["x-forwarded-for"] || "").split(",")[0].trim();
  const realIp = String(request.headers["x-real-ip"] || "").trim();
  const socketIp = request.socket?.remoteAddress || "";
  return forwarded || realIp || socketIp.replace("::ffff:", "") || "127.0.0.1";
}

function hmacBase64(value) {
  return createHmac("sha256", process.env.PAYTR_MERCHANT_KEY)
    .update(value)
    .digest("base64");
}

export function verifyPaytrCallback(body) {
  if (!isPaytrConfigured()) return false;
  const hashString = `${body.merchant_oid}${process.env.PAYTR_MERCHANT_SALT}${body.status}${body.total_amount}`;
  return hmacBase64(hashString) === body.hash;
}

function publicSiteUrl(request) {
  const configured = process.env.PUBLIC_SITE_URL || process.env.APP_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (configured) return configured.startsWith("http") ? configured.replace(/\/$/, "") : `https://${configured}`.replace(/\/$/, "");
  return `${request.protocol}://${request.get("host")}`;
}

export async function createPaytrIframeToken({ request, order, items }) {
  if (!isPaytrConfigured()) {
    throw new Error("PayTR bilgileri tanımlı değil.");
  }

  const merchantId = String(process.env.PAYTR_MERCHANT_ID);
  const merchantSalt = String(process.env.PAYTR_MERCHANT_SALT);
  const testMode = String(process.env.PAYTR_TEST_MODE ?? "1") === "1" ? "1" : "0";
  const noInstallment = String(process.env.PAYTR_NO_INSTALLMENT ?? "0");
  const maxInstallment = String(process.env.PAYTR_MAX_INSTALLMENT ?? "0");
  const currency = process.env.PAYTR_CURRENCY || "TL";
  const paymentAmount = String(Math.round(Number(order.total || 0) * 100));
  const userBasket = Buffer.from(JSON.stringify(
    items.map((item) => [item.name, Number(item.price || 0).toFixed(2), Number(item.quantity || 1)])
  )).toString("base64");
  const userIp = getClientIp(request);
  const baseUrl = publicSiteUrl(request);

  const hashString = `${merchantId}${userIp}${order.order_no}${order.email}${paymentAmount}${userBasket}${noInstallment}${maxInstallment}${currency}${testMode}`;
  const paytrToken = hmacBase64(`${hashString}${merchantSalt}`);
  const form = new URLSearchParams({
    merchant_id: merchantId,
    user_ip: userIp,
    merchant_oid: order.order_no,
    email: order.email,
    payment_amount: paymentAmount,
    paytr_token: paytrToken,
    user_basket: userBasket,
    debug_on: process.env.PAYTR_DEBUG_ON ?? "1",
    no_installment: noInstallment,
    max_installment: maxInstallment,
    user_name: order.customer_name,
    user_address: order.address,
    user_phone: order.phone,
    merchant_ok_url: `${baseUrl}/siparis-basarili?paytr=1&order=${encodeURIComponent(order.order_no)}`,
    merchant_fail_url: `${baseUrl}/odeme-basarisiz?order=${encodeURIComponent(order.order_no)}`,
    timeout_limit: process.env.PAYTR_TIMEOUT_LIMIT || "30",
    currency,
    test_mode: testMode,
    lang: "tr"
  });

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.status !== "success") {
    throw new Error(result?.reason || "PayTR token alınamadı.");
  }

  return {
    token: result.token,
    iframeUrl: `https://www.paytr.com/odeme/guvenli/${result.token}`
  };
}
