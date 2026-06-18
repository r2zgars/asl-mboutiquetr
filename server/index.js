import "dotenv/config";
import express from "express";
import multer from "multer";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash, randomBytes, randomInt } from "node:crypto";
import * as data from "./data.js";
import { hashPassword, safeJson, verifyPassword } from "./utils.js";
import { sendVerificationEmail } from "./mailer.js";
import { createPaytrIframeToken, isPaytrConfigured, paytrPublicConfig, verifyPaytrCallback } from "./paytr.js";
import { isSupabaseStorageEnabled, uploadImage } from "./storage.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const uploadDir = join(root, "public", "uploads");
const useSupabaseStorage = isSupabaseStorageEnabled();
if (!useSupabaseStorage) mkdirSync(uploadDir, { recursive: true });

const app = express();
const port = Number(process.env.PORT || 3001);
const cookieSecure = process.env.NODE_ENV === "production" ? "; Secure" : "";
app.set("trust proxy", true);

app.use(express.json({ limit: "4mb" }));
app.use(express.urlencoded({ extended: false }));
if (!useSupabaseStorage) app.use("/uploads", express.static(uploadDir));

const upload = multer({
  storage: useSupabaseStorage
    ? multer.memoryStorage()
    : multer.diskStorage({
        destination: uploadDir,
        filename: (_request, file, callback) => {
          const extension = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp",
            "image/gif": ".gif"
          }[file.mimetype] || ".jpg";
          callback(null, `${Date.now()}-${randomBytes(5).toString("hex")}${extension}`);
        }
      }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => {
    callback(null, ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.mimetype));
  }
});

function asyncRoute(handler) {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

function parseCookies(request) {
  return Object.fromEntries(
    String(request.headers.cookie || "")
      .split(";")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const index = item.indexOf("=");
        return [decodeURIComponent(item.slice(0, index)), decodeURIComponent(item.slice(index + 1))];
      })
  );
}

async function getAdmin(request) {
  return data.getSessionUser(parseCookies(request).aslim_admin, "admin");
}

const requireAdmin = asyncRoute(async (request, response, next) => {
  const session = await getAdmin(request);
  if (!session) return response.status(401).json({ message: "Oturum aÃ§manÄ±z gerekiyor." });
  request.admin = session;
  request.sessionToken = parseCookies(request).aslim_admin;
  next();
});

async function getCustomer(request) {
  return data.getSessionUser(parseCookies(request).aslim_customer, "customer");
}

const requireCustomer = asyncRoute(async (request, response, next) => {
  const customer = await getCustomer(request);
  if (!customer) return response.status(401).json({ message: "Bu iÅŸlem iÃ§in giriÅŸ yapmanÄ±z gerekiyor." });
  request.customer = customer;
  request.customerSessionToken = parseCookies(request).aslim_customer;
  next();
});

function publicCustomer(customer) {
  if (!customer) return null;
  return {
    id: Number(customer.id),
    email: customer.email,
    name: customer.name,
    phone: customer.phone || "",
    email_verified: Boolean(customer.email_verified_at),
    role: customer.role
  };
}

function verificationHash(userId, purpose, code) {
  return createHash("sha256").update(`${userId}:${purpose}:${code}`).digest("hex");
}

async function issueVerificationCode(customer, purpose) {
  const code = String(randomInt(100000, 1000000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const target = customer.email;

  await data.createVerificationCode({
    userId: customer.id,
    purpose,
    target,
    codeHash: verificationHash(customer.id, purpose, code),
    expiresAt
  });

  try {
    const result = await sendVerificationEmail({
          email: customer.email,
          name: customer.name,
          code,
          purpose
        });
    return {
      sent: result.sent,
      developmentCode: !result.sent && process.env.NODE_ENV !== "production" ? code : undefined
    };
  } catch (error) {
    await data.deleteVerificationCodes(customer.id, purpose);
    throw error;
  }
}

async function consumeVerificationCode(customer, purpose, code) {
  const target = customer.email;
  const record = await data.getLatestVerificationCode({
    userId: customer.id,
    purpose,
    target
  });

  if (!record || new Date(record.expires_at).getTime() < Date.now()) {
    if (record) await data.deleteVerificationCode(record.id);
    return { ok: false, message: "DoÄŸrulama kodunun sÃ¼resi dolmuÅŸ. Yeni kod isteyin." };
  }
  if (Number(record.attempts || 0) >= 5) {
    await data.deleteVerificationCode(record.id);
    return { ok: false, message: "Ã‡ok fazla hatalÄ± deneme yapÄ±ldÄ±. Yeni kod isteyin." };
  }
  if (verificationHash(customer.id, purpose, String(code || "").trim()) !== record.code_hash) {
    await data.incrementVerificationAttempts(record);
    return { ok: false, message: "DoÄŸrulama kodu hatalÄ±." };
  }

  await data.deleteVerificationCode(record.id);
  return { ok: true };
}

function customerCookie(token, maxAge = 7 * 24 * 60 * 60) {
  return `aslim_customer=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${cookieSecure}`;
}

function adminCookie(token, maxAge = 7 * 24 * 60 * 60) {
  return `aslim_admin=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${cookieSecure}`;
}

function makeSession() {
  return {
    token: randomBytes(32).toString("hex"),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  };
}

app.get("/api/store", asyncRoute(async (_request, response) => {
  response.json(await data.getStore());
}));

app.get("/api/auth/status", asyncRoute(async (request, response) => {
  response.json({
    customer: publicCustomer(await getCustomer(request)),
    adminAuthenticated: Boolean(await getAdmin(request))
  });
}));

app.get("/api/products", asyncRoute(async (request, response) => {
  response.json(await data.listProducts(request.query));
}));

app.get("/api/products/:slug", asyncRoute(async (request, response) => {
  const product = await data.getProductBySlug(request.params.slug);
  if (!product) return response.status(404).json({ message: "ÃœrÃ¼n bulunamadÄ±." });
  response.json(product);
}));

app.post("/api/auth/register", asyncRoute(async (request, response) => {
  const name = String(request.body.name || "").trim();
  const email = String(request.body.email || "").trim().toLowerCase();
  const password = String(request.body.password || "");
  if (name.length < 2) return response.status(400).json({ message: "Ad soyad en az 2 karakter olmalÄ±dÄ±r." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return response.status(400).json({ message: "GeÃ§erli bir e-posta adresi girin." });
  }
  if (password.length < 8) return response.status(400).json({ message: "Åifre en az 8 karakter olmalÄ±dÄ±r." });
  if (await data.getUserByEmail(email)) {
    return response.status(409).json({ message: "Bu e-posta adresiyle daha Ã¶nce hesap oluÅŸturulmuÅŸ." });
  }

  const customer = await data.createUser({ email, name, passwordHash: hashPassword(password), role: "customer" });
  const session = makeSession();
  await data.createSession({ ...session, userId: customer.id });
  response.setHeader("Set-Cookie", customerCookie(session.token));
  try {
    const verification = await issueVerificationCode(customer, "email_verification");
    response.status(201).json({ ...publicCustomer(customer), ...verification });
  } catch {
    response.status(201).json({
      ...publicCustomer(customer),
      emailDeliveryFailed: true,
      message: "HesabÄ±nÄ±z oluÅŸturuldu fakat doÄŸrulama e-postasÄ± gÃ¶nderilemedi. HesabÄ±m sayfasÄ±ndan tekrar deneyin."
    });
  }
}));

app.post("/api/auth/login", asyncRoute(async (request, response) => {
  const email = String(request.body.email || "").trim().toLowerCase();
  const user = await data.getUserByEmail(email);
  if (!user || !verifyPassword(String(request.body.password || ""), user.password_hash)) {
    return response.status(401).json({ message: "E-posta veya ÅŸifre hatalÄ±." });
  }

  const session = makeSession();
  await data.createSession({ ...session, userId: user.id });
  if (user.role === "admin") {
    response.setHeader("Set-Cookie", adminCookie(session.token));
    return response.json({
      admin: true,
      redirect: "/admin",
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    });
  }
  if (user.role !== "customer") {
    return response.status(401).json({ message: "E-posta veya ÅŸifre hatalÄ±." });
  }

  response.setHeader("Set-Cookie", customerCookie(session.token));
  response.json(publicCustomer(user));
}));

app.get("/api/auth/me", asyncRoute(async (request, response) => {
  const customer = await getCustomer(request);
  if (!customer) return response.status(401).json({ message: "MÃ¼ÅŸteri oturumu bulunamadÄ±." });
  response.json(publicCustomer(customer));
}));

app.post("/api/auth/logout", asyncRoute(async (request, response) => {
  const token = parseCookies(request).aslim_customer;
  if (token) await data.deleteSession(token);
  response.setHeader("Set-Cookie", customerCookie("", 0));
  response.json({ ok: true });
}));

app.post("/api/account/verification/send", requireCustomer, asyncRoute(async (request, response) => {
  const purpose = request.body.purpose === "password_change" ? "password_change" : "email_verification";
  if (purpose === "email_verification" && request.customer.email_verified_at) {
    return response.status(400).json({ message: "E-posta adresiniz zaten doğrulanmış." });
  }
  try {
    const result = await issueVerificationCode(request.customer, purpose);
    response.json({
      ...result,
      message: result.sent
        ? "Doğrulama kodu e-posta adresinize gönderildi."
        : "SMTP ayarı olmadığı için kod yalnızca yerel geliştirme ekranında gösterildi."
    });
  } catch (error) {
    response.status(502).json({ message: error.message || "Doğrulama e-postası gönderilemedi. SMTP ayarlarını kontrol edin." });
  }
}));

app.post("/api/account/verification/confirm", requireCustomer, asyncRoute(async (request, response) => {
  const result = await consumeVerificationCode(request.customer, "email_verification", request.body.code);
  if (!result.ok) return response.status(400).json({ message: result.message });

  const customer = await data.updateUserEmailVerified(request.customer.id);
  response.json({ customer: publicCustomer(customer), message: "E-posta adresiniz doğrulandı." });
}));
app.put("/api/account/profile", requireCustomer, asyncRoute(async (request, response) => {
  const name = String(request.body.name || "").trim();
  const phone = String(request.body.phone || "").trim();
  const email = String(request.body.email || "").trim().toLowerCase();
  if (name.length < 2) return response.status(400).json({ message: "Ad soyad en az 2 karakter olmalıdır." });
  if (phone.replace(/\D/g, "").length < 10) {
    return response.status(400).json({ message: "Telefon numarası zorunludur." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return response.status(400).json({ message: "Geçerli bir e-posta adresi girin." });
  }
  const duplicate = await data.getUserByEmail(email);
  if (duplicate && Number(duplicate.id) !== Number(request.customer.id)) {
    return response.status(409).json({ message: "Bu e-posta adresi başka bir hesapta kullanılıyor." });
  }

  const emailChanged = email !== request.customer.email;
  const customer = await data.updateCustomerProfile({
    id: request.customer.id,
    name,
    phone,
    email,
    clearEmailVerification: emailChanged
  });
  let verification = {};
  if (emailChanged) {
    try {
      verification = await issueVerificationCode(customer, "email_verification");
    } catch {
      verification = { emailDeliveryFailed: true };
    }
  }
  response.json({
    customer: publicCustomer(customer),
    emailChanged,
    ...verification,
    message: emailChanged
      ? "Bilgileriniz güncellendi. Yeni e-posta adresinizi doğrulayın."
      : "Kişisel bilgileriniz güncellendi."
  });
}));
app.put("/api/account/password", requireCustomer, asyncRoute(async (request, response) => {
  const newPassword = String(request.body.newPassword || "");
  if (newPassword.length < 8) {
    return response.status(400).json({ message: "Yeni ÅŸifre en az 8 karakter olmalÄ±dÄ±r." });
  }

  const user = await data.getUserById(request.customer.id);
  const currentPasswordValid = request.body.currentPassword
    ? verifyPassword(String(request.body.currentPassword), user.password_hash)
    : false;
  let codeValid = false;
  let codeError = "";

  if (!currentPasswordValid && request.body.verificationCode) {
    const result = await consumeVerificationCode(request.customer, "password_change", request.body.verificationCode);
    codeValid = result.ok;
    codeError = result.message || "";
  }

  if (!currentPasswordValid && !codeValid) {
    return response.status(400).json({
      message: codeError || "Mevcut ÅŸifrenizi veya e-posta doÄŸrulama kodunu doÄŸru girin."
    });
  }

  await data.updateUserPassword(user.id, hashPassword(newPassword));
  await data.deleteOtherSessions(user.id, request.customerSessionToken);
  response.json({ message: "Åifreniz gÃ¼ncellendi." });
}));

app.get("/api/account/favorites", requireCustomer, asyncRoute(async (request, response) => {
  response.json(await data.listFavorites(request.customer.id));
}));

app.post("/api/account/favorites/:productId", requireCustomer, asyncRoute(async (request, response) => {
  const product = await data.addFavorite(request.customer.id, request.params.productId);
  if (!product) return response.status(404).json({ message: "ÃœrÃ¼n bulunamadÄ±." });
  response.status(201).json({ productId: Number(product.id) });
}));

app.delete("/api/account/favorites/:productId", requireCustomer, asyncRoute(async (request, response) => {
  await data.removeFavorite(request.customer.id, request.params.productId);
  response.status(204).end();
}));

app.get("/api/account/orders", asyncRoute(async (request, response) => {
  const customer = await getCustomer(request);
  if (!customer) return response.status(401).json({ message: "MÃ¼ÅŸteri oturumu bulunamadÄ±." });
  response.json(await data.listCustomerOrders(customer));
}));

app.post("/api/orders", asyncRoute(async (request, response) => {
  const customer = await getCustomer(request);
  if (!customer) {
    return response.status(401).json({ message: "SipariÅŸ verebilmek iÃ§in giriÅŸ yapmanÄ±z gerekiyor." });
  }
  if (!customer.email_verified_at) {
    return response.status(403).json({ message: "SipariÅŸ vermeden Ã¶nce e-posta adresinizi doÄŸrulayÄ±n." });
  }
  const body = request.body;
  const required = ["customerName", "phone", "city", "district", "neighborhood", "street", "buildingNo", "floor", "apartmentNo"];
  if (required.some((key) => !String(body[key] || "").trim())) {
    return response.status(400).json({ message: "LÃ¼tfen zorunlu teslimat alanlarÄ±nÄ± doldurun." });
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return response.status(400).json({ message: "Sepetiniz boÅŸ." });
  }
  if (!isPaytrConfigured()) {
    return response.status(503).json({ message: "Ã–deme altyapÄ±sÄ± henÃ¼z tanÄ±mlÄ± deÄŸil. LÃ¼tfen daha sonra tekrar deneyin." });
  }

  const items = [];
  let subtotal = 0;
  for (const requested of body.items) {
    const product = await data.getProductForOrder(requested.productId);
    const quantity = Math.max(1, Math.min(20, Number(requested.quantity || 1)));
    if (!product || product.stock < quantity) {
      return response.status(400).json({ message: `${product?.name || "Bir Ã¼rÃ¼n"} iÃ§in yeterli stok yok.` });
    }
    const lineTotal = product.price * quantity;
    subtotal += lineTotal;
    const variantImages = safeJson(product.variant_images);
    const selectedImage =
      variantImages.find((variant) => variant.color === requested.color && variant.size === requested.size)?.images?.[0] ||
      variantImages.find((variant) => variant.color === requested.color && !variant.size)?.images?.[0] ||
      variantImages.find((variant) => variant.size === requested.size && !variant.color)?.images?.[0] ||
      safeJson(product.images)[0] ||
      "";
    items.push({
      productId: Number(product.id),
      name: product.name,
      slug: product.slug,
      image: selectedImage,
      price: product.price,
      quantity,
      size: requested.size || "",
      color: requested.color || "",
      lineTotal,
      stockBeforeOrder: product.stock
    });
  }

  const settings = await data.getSettings();
  const shipping = subtotal >= Number(settings.freeShippingThreshold || 0) ? 0 : Number(settings.shippingFee || 0);
  const orderNo = `ASL-${new Date().toISOString().slice(2, 10).replaceAll("-", "")}-${String(Date.now()).slice(-5)}`;
  const deliveryAddress = [
    String(body.neighborhood || "").trim(),
    String(body.street || "").trim(),
    `Bina No: ${String(body.buildingNo || "").trim()}`,
    `Kat: ${String(body.floor || "").trim()}`,
    `Daire: ${String(body.apartmentNo || "").trim()}`,
    String(body.address || "").trim()
  ].filter(Boolean).join(", ");

  const stockedItems = [];
  let createdOrder = null;
  try {
    for (const item of items) {
      await data.decrementProductStock(item.productId, item.quantity, item.stockBeforeOrder);
      stockedItems.push(item);
    }
    const orderItems = items.map(({ stockBeforeOrder, ...item }) => item);
    createdOrder = await data.createOrder({
      userId: customer.id,
      orderNo,
      customerName: String(body.customerName).trim(),
      email: customer.email,
      phone: String(body.phone).trim(),
      address: deliveryAddress,
      city: String(body.city).trim(),
      district: String(body.district || "").trim(),
      neighborhood: String(body.neighborhood || "").trim(),
      street: String(body.street || "").trim(),
      buildingNo: String(body.buildingNo || "").trim(),
      floor: String(body.floor || "").trim(),
      apartmentNo: String(body.apartmentNo || "").trim(),
      postalCode: String(body.postalCode || "").trim(),
      notes: String(body.notes || "").trim(),
      paymentMethod: "PayTR",
      status: "Ã–deme Bekleniyor",
      subtotal,
      shipping,
      total: subtotal + shipping,
      items: orderItems
    });
  } catch (error) {
    await Promise.allSettled(stockedItems.map((item) => data.restoreProductStock(item.productId, item.quantity)));
    return response.status(500).json({ message: "SipariÅŸ oluÅŸturulamadÄ±.", detail: error.message });
  }

  try {
    const paytr = await createPaytrIframeToken({ request, order: createdOrder, items });
    await data.updateOrder(createdOrder.id, { paytr_token: paytr.token, paytr_status: "token_created" });
    return response.status(201).json({
      id: Number(createdOrder.id),
      orderNo,
      total: subtotal + shipping,
      paymentMethod: "PayTR",
      paytr
    });
  } catch (error) {
    await Promise.allSettled(stockedItems.map((item) => data.restoreProductStock(item.productId, item.quantity)));
    await data.updateOrder(createdOrder.id, {
      status: "Ä°ptal",
      paytr_status: "token_failed",
      cancel_reason: error.message
    });
    return response.status(502).json({ message: "PayTR Ã¶deme ekranÄ± baÅŸlatÄ±lamadÄ±.", detail: error.message, orderNo });
  }
}));

app.get("/api/paytr/config", (_request, response) => {
  response.json(paytrPublicConfig());
});

app.post("/api/paytr/orders/:orderNo/iframe-token", requireCustomer, asyncRoute(async (request, response) => {
  if (!isPaytrConfigured()) {
    return response.status(503).json({ message: "PayTR bilgileri henÃ¼z tanÄ±mlÄ± deÄŸil." });
  }
  const order = await data.getOrderByOrderNoForCustomer(request.params.orderNo, request.customer);
  if (!order) return response.status(404).json({ message: "SipariÅŸ bulunamadÄ±." });

  try {
    const paytr = await createPaytrIframeToken({ request, order, items: safeJson(order.items) });
    await data.updateOrder(order.id, { paytr_token: paytr.token, paytr_status: "token_created" });
    response.json({ orderNo: order.order_no, paytr });
  } catch (error) {
    response.status(502).json({ message: "PayTR Ã¶deme ekranÄ± baÅŸlatÄ±lamadÄ±.", detail: error.message });
  }
}));

app.post("/api/paytr/callback", asyncRoute(async (request, response) => {
  if (!verifyPaytrCallback(request.body)) {
    return response.status(400).type("text/plain").send("BAD HASH");
  }

  const order = await data.getOrderByOrderNo(request.body.merchant_oid);
  if (!order) return response.status(404).type("text/plain").send("ORDER NOT FOUND");

  const callbackPayload = request.body;
  if (request.body.status === "success") {
    await data.updateOrder(order.id, {
      status: "Yeni",
      cancel_reason: "",
      paytr_status: "success",
      paytr_total_amount: Number(request.body.total_amount || 0),
      paytr_callback: callbackPayload
    });
  } else {
    if (order.status !== "Ä°ptal") {
      await Promise.allSettled(
        safeJson(order.items).map((item) => data.restoreProductStock(item.productId, Number(item.quantity || 0)))
      );
    }
    await data.updateOrder(order.id, {
      status: "Ä°ptal",
      paytr_status: "failed",
      paytr_total_amount: Number(request.body.total_amount || 0),
      paytr_callback: callbackPayload,
      cancel_reason: request.body.failed_reason_msg || "PayTR Ã¶demesi baÅŸarÄ±sÄ±z oldu."
    });
  }

  response.type("text/plain").send("OK");
}));

app.post("/api/admin/login", asyncRoute(async (request, response) => {
  const email = String(request.body.email || "").trim().toLowerCase();
  const user = await data.getUserByEmail(email, "admin");
  if (!user || !verifyPassword(String(request.body.password || ""), user.password_hash)) {
    return response.status(401).json({ message: "E-posta veya ÅŸifre hatalÄ±." });
  }

  const session = makeSession();
  await data.createSession({ ...session, userId: user.id });
  response.setHeader("Set-Cookie", adminCookie(session.token));
  response.json({ id: user.id, email: user.email, name: user.name });
}));

app.post("/api/admin/logout", requireAdmin, asyncRoute(async (request, response) => {
  await data.deleteSession(request.sessionToken);
  response.setHeader("Set-Cookie", adminCookie("", 0));
  response.json({ ok: true });
}));

app.get("/api/admin/me", requireAdmin, (request, response) => response.json(request.admin));

app.get("/api/admin/stats", requireAdmin, asyncRoute(async (_request, response) => {
  response.json(await data.getAdminStats());
}));

app.get("/api/admin/products", requireAdmin, asyncRoute(async (_request, response) => {
  response.json(await data.listAdminProducts());
}));

app.post("/api/admin/products", requireAdmin, asyncRoute(async (request, response) => {
  try {
    response.status(201).json(await data.createProduct(request.body));
  } catch (error) {
    response.status(400).json({ message: error.message });
  }
}));

app.put("/api/admin/products/:id", requireAdmin, asyncRoute(async (request, response) => {
  try {
    response.json(await data.updateProduct(request.params.id, request.body));
  } catch (error) {
    response.status(400).json({ message: error.message });
  }
}));

app.delete("/api/admin/products/:id", requireAdmin, asyncRoute(async (request, response) => {
  await data.deleteProduct(request.params.id);
  response.json({ ok: true });
}));

app.get("/api/admin/categories", requireAdmin, asyncRoute(async (_request, response) => {
  response.json(await data.listAdminCategories());
}));

app.post("/api/admin/categories", requireAdmin, asyncRoute(async (request, response) => {
  try {
    response.status(201).json(await data.createCategory(request.body));
  } catch (error) {
    response.status(400).json({ message: error.message });
  }
}));

app.put("/api/admin/categories/:id", requireAdmin, asyncRoute(async (request, response) => {
  try {
    response.json(await data.updateCategory(request.params.id, request.body));
  } catch (error) {
    response.status(400).json({ message: error.message });
  }
}));

app.delete("/api/admin/categories/:id", requireAdmin, asyncRoute(async (request, response) => {
  await data.deleteCategory(request.params.id);
  response.json({ ok: true });
}));

app.get("/api/admin/orders", requireAdmin, asyncRoute(async (_request, response) => {
  response.json(await data.listAdminOrders());
}));

app.patch("/api/admin/orders/:id", requireAdmin, asyncRoute(async (request, response) => {
  const allowed = ["Ã–deme Bekleniyor", "Yeni", "HazÄ±rlanÄ±yor", "Kargoda", "TamamlandÄ±", "Ä°ptal"];
  const order = await data.getOrderById(request.params.id);
  if (!order) return response.status(404).json({ message: "SipariÅŸ bulunamadÄ±." });

  const nextStatus = request.body.status ? String(request.body.status) : order.status;
  if (!allowed.includes(nextStatus)) {
    return response.status(400).json({ message: "GeÃ§ersiz sipariÅŸ durumu." });
  }

  const trackingCode = request.body.trackingCode !== undefined
    ? String(request.body.trackingCode || "").trim()
    : order.tracking_code || "";
  let cancelReason = request.body.cancelReason !== undefined
    ? String(request.body.cancelReason || "").trim()
    : order.cancel_reason || "";

  if (nextStatus === "Ä°ptal" && !cancelReason) {
    return response.status(400).json({ message: "SipariÅŸ iptali iÃ§in sebep girin." });
  }
  if (nextStatus !== "Ä°ptal" && request.body.status) {
    cancelReason = "";
  }

  await data.updateOrder(order.id, {
    status: nextStatus,
    tracking_code: trackingCode,
    cancel_reason: cancelReason
  });
  response.json({ ok: true });
}));

app.get("/api/admin/settings", requireAdmin, asyncRoute(async (_request, response) => {
  response.json(await data.getSettings());
}));

app.put("/api/admin/settings", requireAdmin, asyncRoute(async (request, response) => {
  response.json(await data.upsertSettings(request.body));
}));

app.put("/api/admin/password", requireAdmin, asyncRoute(async (request, response) => {
  const user = await data.getUserById(request.admin.id);
  if (!verifyPassword(String(request.body.currentPassword || ""), user.password_hash)) {
    return response.status(400).json({ message: "Mevcut ÅŸifre hatalÄ±." });
  }
  const nextPassword = String(request.body.newPassword || "");
  if (nextPassword.length < 10) {
    return response.status(400).json({ message: "Yeni ÅŸifre en az 10 karakter olmalÄ±dÄ±r." });
  }
  await data.updateUserPassword(request.admin.id, hashPassword(nextPassword));
  await data.deleteOtherSessions(request.admin.id, request.sessionToken);
  response.json({ ok: true });
}));

app.post("/api/admin/upload", requireAdmin, upload.single("image"), asyncRoute(async (request, response) => {
  if (!request.file) return response.status(400).json({ message: "GeÃ§erli bir gÃ¶rsel seÃ§in." });
  try {
    const url = await uploadImage(request.file);
    response.status(201).json({ url });
  } catch (error) {
    response.status(500).json({ message: "GÃ¶rsel yÃ¼klenemedi.", detail: error.message });
  }
}));

const distDir = join(root, "dist");
if (existsSync(distDir)) {
  app.use(express.static(distDir));
  app.use((request, response, next) => {
    if (request.path.startsWith("/api") || request.path.startsWith("/uploads")) return next();
    response.sendFile(join(distDir, "index.html"));
  });
}

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ message: "Beklenmeyen bir hata oluÅŸtu.", detail: error.message });
});

if (process.env.VERCEL !== "1") {
  app.listen(port, () => {
    console.log(`AslÄ±m Boutique API http://localhost:${port} adresinde Ã§alÄ±ÅŸÄ±yor.`);
  });
}

export default app;






