import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function slugify(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored = "") {
  const [salt, expectedHex] = String(stored).split(":");
  if (!salt || !expectedHex) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function safeJson(value, fallback = []) {
  if (Array.isArray(value) || (value && typeof value === "object")) return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function toProduct(row) {
  if (!row) return null;
  const category = row.categories || {};
  return {
    ...row,
    category_name: row.category_name ?? category.name ?? null,
    category_slug: row.category_slug ?? category.slug ?? null,
    price: Number(row.price || 0),
    compare_price: row.compare_price == null ? null : Number(row.compare_price),
    stock: Number(row.stock || 0),
    featured: Boolean(row.featured),
    active: Boolean(row.active),
    images: safeJson(row.images),
    sizes: safeJson(row.sizes),
    colors: safeJson(row.colors),
    variant_images: safeJson(row.variant_images)
  };
}

export function toOrder(row) {
  if (!row) return null;
  return {
    ...row,
    subtotal: Number(row.subtotal || 0),
    shipping: Number(row.shipping || 0),
    total: Number(row.total || 0),
    items: safeJson(row.items),
    paytr_callback: safeJson(row.paytr_callback, {})
  };
}
