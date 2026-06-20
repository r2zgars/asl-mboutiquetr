import "dotenv/config";
import express from "express";
import multer from "multer";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import * as data from "./data.js";
import { hashPassword, safeJson, verifyPassword } from "./utils.js";
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
  if (!session) return response.status(401).json({ message: "Oturum açmanız gerekiyor." });
  request.admin = session;
  request.sessionToken = parseCookies(request).aslim_admin;
  next();
});

async function getCustomer(request) {
  const cookies = parseCookies(request);
  return (
    (await data.getSessionUser(cookies.aslim_customer, "customer")) ||
    (await data.getSessionUser(cookies.aslim_admin, "admin"))
  );
}

const requireCustomer = asyncRoute(async (request, response, next) => {
  const customer = await getCustomer(request);
  if (!customer) return response.status(401).json({ message: "Bu işlem için giriş yapmanız gerekiyor." });
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
  if (!product) return response.status(404).json({ message: "Ürün bulunamadı." });
  response.json(product);
}));

app.post("/api/auth/register", asyncRoute(async (request, response) => {
  const name = String(request.body.name || "").trim();
  const email = String(request.body.email || "").trim().toLowerCase();
  const password = String(request.body.password || "");
  if (name.length < 2) return response.status(400).json({ message: "Ad soyad en az 2 karakter olmalıdır." });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return response.status(400).json({ message: "Geçerli bir e-posta adresi girin." });
  }
  if (password.length < 8) return response.status(400).json({ message: "Şifre en az 8 karakter olmalıdır." });
  if (await data.getUserByEmail(email)) {
    return response.status(409).json({ message: "Bu e-posta adresiyle daha önce hesap oluşturulmuş." });
  }

  const customer = await data.createUser({ email, name, passwordHash: hashPassword(password), role: "customer" });
  const verifiedCustomer = await data.updateUserEmailVerified(customer.id);
  const session = makeSession();
  await data.createSession({ ...session, userId: verifiedCustomer.id });
  response.setHeader("Set-Cookie", customerCookie(session.token));
  response.status(201).json(publicCustomer(verifiedCustomer));
}));

app.post("/api/auth/login", asyncRoute(async (request, response) => {
  const email = String(request.body.email || "").trim().toLowerCase();
  const user = await data.getUserByEmail(email);
  if (!user || !verifyPassword(String(request.body.password || ""), user.password_hash)) {
    return response.status(401).json({ message: "E-posta veya şifre hatalı." });
  }

  const session = makeSession();
  await data.createSession({ ...session, userId: user.id });
  if (user.role === "admin") {
    response.setHeader("Set-Cookie", [adminCookie(session.token), customerCookie(session.token)]);
    return response.json({
      admin: true,
      redirect: "/admin",
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    });
  }
  if (user.role !== "customer") {
    return response.status(401).json({ message: "E-posta veya şifre hatalı." });
  }

  response.setHeader("Set-Cookie", customerCookie(session.token));
  response.json(publicCustomer(user));
}));

app.get("/api/auth/me", asyncRoute(async (request, response) => {
  const customer = await getCustomer(request);
  if (!customer) return response.status(401).json({ message: "Müşteri oturumu bulunamadı." });
  response.json(publicCustomer(customer));
}));

app.post("/api/auth/logout", asyncRoute(async (request, response) => {
  const token = parseCookies(request).aslim_customer;
  if (token) await data.deleteSession(token);
  response.setHeader("Set-Cookie", customerCookie("", 0));
  response.json({ ok: true });
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

  const customer = await data.updateCustomerProfile({
    id: request.customer.id,
    name,
    phone,
    email
  });
  response.json({
    customer: publicCustomer(customer),
    message: "Kişisel bilgileriniz güncellendi."
  });
}));
app.put("/api/account/password", requireCustomer, asyncRoute(async (request, response) => {
  const newPassword = String(request.body.newPassword || "");
  if (newPassword.length < 8) {
    return response.status(400).json({ message: "Yeni şifre en az 8 karakter olmalıdır." });
  }

  const user = await data.getUserById(request.customer.id);
  const currentPasswordValid = request.body.currentPassword
    ? verifyPassword(String(request.body.currentPassword), user.password_hash)
    : false;
  if (!currentPasswordValid) {
    return response.status(400).json({ message: "Mevcut şifrenizi doğru girin." });
  }

  await data.updateUserPassword(user.id, hashPassword(newPassword));
  await data.deleteOtherSessions(user.id, request.customerSessionToken);
  response.json({ message: "Şifreniz güncellendi." });
}));

app.get("/api/account/favorites", requireCustomer, asyncRoute(async (request, response) => {
  response.json(await data.listFavorites(request.customer.id));
}));

app.post("/api/account/favorites/:productId", requireCustomer, asyncRoute(async (request, response) => {
  const product = await data.addFavorite(request.customer.id, request.params.productId);
  if (!product) return response.status(404).json({ message: "Ürün bulunamadı." });
  response.status(201).json({ productId: Number(product.id) });
}));

app.delete("/api/account/favorites/:productId", requireCustomer, asyncRoute(async (request, response) => {
  await data.removeFavorite(request.customer.id, request.params.productId);
  response.status(204).end();
}));

app.get("/api/account/orders", asyncRoute(async (request, response) => {
  const customer = await getCustomer(request);
  if (!customer) return response.status(401).json({ message: "Müşteri oturumu bulunamadı." });
  response.json(await data.listCustomerOrders(customer));
}));
app.post("/api/orders", (_request, response) => {
  response.status(410).json({ message: "Siparişler artık WhatsApp üzerinden alınır." });
});

app.post("/api/admin/login", asyncRoute(async (request, response) => {
  const email = String(request.body.email || "").trim().toLowerCase();
  const user = await data.getUserByEmail(email, "admin");
  if (!user || !verifyPassword(String(request.body.password || ""), user.password_hash)) {
    return response.status(401).json({ message: "E-posta veya şifre hatalı." });
  }

  const session = makeSession();
  await data.createSession({ ...session, userId: user.id });
  response.setHeader("Set-Cookie", [adminCookie(session.token), customerCookie(session.token)]);
  response.json({ id: user.id, email: user.email, name: user.name });
}));

app.post("/api/admin/logout", requireAdmin, asyncRoute(async (request, response) => {
  await data.deleteSession(request.sessionToken);
  response.setHeader("Set-Cookie", [adminCookie("", 0), customerCookie("", 0)]);
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
  const allowed = ["Ödeme Bekleniyor", "Yeni", "Hazırlanıyor", "Kargoda", "Tamamlandı", "İptal"];
  const order = await data.getOrderById(request.params.id);
  if (!order) return response.status(404).json({ message: "Sipariş bulunamadı." });

  const nextStatus = request.body.status ? String(request.body.status) : order.status;
  if (!allowed.includes(nextStatus)) {
    return response.status(400).json({ message: "Geçersiz sipariş durumu." });
  }

  const trackingCode = request.body.trackingCode !== undefined
    ? String(request.body.trackingCode || "").trim()
    : order.tracking_code || "";
  let cancelReason = request.body.cancelReason !== undefined
    ? String(request.body.cancelReason || "").trim()
    : order.cancel_reason || "";

  if (nextStatus === "İptal" && !cancelReason) {
    return response.status(400).json({ message: "Sipariş iptali için sebep girin." });
  }
  if (nextStatus !== "İptal" && request.body.status) {
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
    return response.status(400).json({ message: "Mevcut şifre hatalı." });
  }
  const nextPassword = String(request.body.newPassword || "");
  if (nextPassword.length < 10) {
    return response.status(400).json({ message: "Yeni şifre en az 10 karakter olmalıdır." });
  }
  await data.updateUserPassword(request.admin.id, hashPassword(nextPassword));
  await data.deleteOtherSessions(request.admin.id, request.sessionToken);
  response.json({ ok: true });
}));

app.post("/api/admin/upload", requireAdmin, upload.single("image"), asyncRoute(async (request, response) => {
  if (!request.file) return response.status(400).json({ message: "Geçerli bir görsel seçin." });
  try {
    const url = await uploadImage(request.file);
    response.status(201).json({ url });
  } catch (error) {
    response.status(500).json({ message: "Görsel yüklenemedi.", detail: error.message });
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
  response.status(500).json({ message: "Beklenmeyen bir hata oluştu.", detail: error.message });
});

if (process.env.VERCEL !== "1") {
  app.listen(port, () => {
    console.log(`Aslım Boutique API http://localhost:${port} adresinde çalışıyor.`);
  });
}

export default app;






