import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { db, safeJson } from "../server/db.js";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY zorunludur.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function upsertSingle(table, payload, onConflict, select = "*") {
  const { data, error } = await supabase
    .from(table)
    .upsert(payload, { onConflict })
    .select(select)
    .single();
  if (error) throw new Error(`${table}: ${error.message}`);
  return data;
}

async function migrate() {
  const userMap = new Map();
  for (const user of db.prepare("SELECT * FROM users ORDER BY id").all()) {
    const saved = await upsertSingle("users", {
      email: user.email,
      name: user.name,
      phone: user.phone || "",
      email_verified_at: user.email_verified_at || null,
      password_hash: user.password_hash,
      role: user.role || "customer",
      created_at: user.created_at
    }, "email", "id,email");
    userMap.set(user.email.toLowerCase(), saved.id);
  }

  const categoryMap = new Map();
  for (const category of db.prepare("SELECT * FROM categories ORDER BY sort_order, id").all()) {
    const saved = await upsertSingle("categories", {
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      image: category.image || "",
      active: Boolean(category.active),
      sort_order: Number(category.sort_order || 0)
    }, "slug", "id,slug");
    categoryMap.set(category.slug, saved.id);
  }

  const productMap = new Map();
  const productIdMap = new Map();
  for (const product of db.prepare(`
    SELECT products.*, categories.slug AS category_slug
    FROM products
    LEFT JOIN categories ON categories.id = products.category_id
    ORDER BY products.id
  `).all()) {
    const saved = await upsertSingle("products", {
      category_id: categoryMap.get(product.category_slug) || null,
      name: product.name,
      slug: product.slug,
      sku: product.sku || "",
      description: product.description || "",
      price: Number(product.price || 0),
      compare_price: product.compare_price == null ? null : Number(product.compare_price),
      stock: Number(product.stock || 0),
      images: safeJson(product.images),
      sizes: safeJson(product.sizes),
      colors: safeJson(product.colors),
      variant_images: safeJson(product.variant_images),
      featured: Boolean(product.featured),
      active: Boolean(product.active),
      created_at: product.created_at,
      updated_at: product.updated_at
    }, "slug", "id,slug");
    productMap.set(product.slug, saved.id);
    productIdMap.set(Number(product.id), saved.id);
  }

  for (const row of db.prepare("SELECT key, value FROM settings").all()) {
    await upsertSingle("settings", {
      key: row.key,
      value: safeJson(row.value, row.value)
    }, "key", "key");
  }

  const remapOrderItems = (items) => safeJson(items).map((item) => {
    const mappedId = productMap.get(item.slug) || productIdMap.get(Number(item.productId));
    return mappedId ? { ...item, productId: mappedId } : item;
  });

  for (const order of db.prepare("SELECT * FROM orders ORDER BY id").all()) {
    await upsertSingle("orders", {
      user_id: userMap.get(String(order.email || "").toLowerCase()) || null,
      order_no: order.order_no,
      customer_name: order.customer_name,
      email: order.email,
      phone: order.phone,
      address: order.address,
      city: order.city,
      district: order.district || "",
      neighborhood: order.neighborhood || "",
      street: order.street || "",
      building_no: order.building_no || "",
      floor: order.floor || "",
      apartment_no: order.apartment_no || "",
      postal_code: order.postal_code || "",
      notes: order.notes || "",
      payment_method: order.payment_method === "Kapıda Ödeme" ? "PayTR" : (order.payment_method || "PayTR"),
      status: order.status || "Yeni",
      tracking_code: order.tracking_code || "",
      cancel_reason: order.cancel_reason || "",
      subtotal: Number(order.subtotal || 0),
      shipping: Number(order.shipping || 0),
      total: Number(order.total || 0),
      items: remapOrderItems(order.items),
      paytr_token: order.paytr_token || "",
      paytr_status: order.paytr_status || "",
      paytr_total_amount: order.paytr_total_amount == null ? null : Number(order.paytr_total_amount),
      paytr_callback: safeJson(order.paytr_callback, {}),
      created_at: order.created_at
    }, "order_no", "id,order_no");
  }

  const favorites = db.prepare(`
    SELECT users.email, products.slug
    FROM favorites
    JOIN users ON users.id = favorites.user_id
    JOIN products ON products.id = favorites.product_id
  `).all();
  for (const favorite of favorites) {
    const userId = userMap.get(favorite.email.toLowerCase());
    const productId = productMap.get(favorite.slug);
    if (!userId || !productId) continue;
    await supabase.from("favorites").upsert({ user_id: userId, product_id: productId }, { onConflict: "user_id,product_id" });
  }

  console.log(JSON.stringify({
    users: userMap.size,
    categories: categoryMap.size,
    products: productMap.size,
    orders: db.prepare("SELECT COUNT(*) AS count FROM orders").get().count,
    favorites: favorites.length
  }, null, 2));
}

migrate().catch((error) => {
  console.error(error);
  process.exit(1);
});
