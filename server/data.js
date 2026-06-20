import { createClient } from "@supabase/supabase-js";
import { safeJson, slugify, toOrder, toProduct } from "./utils.js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
  : null;

const productSelect = "*, categories(name, slug)";
const cancelledStatus = "İptal";

export function isDatabaseConfigured() {
  return Boolean(supabase);
}

function client() {
  if (!supabase) {
    throw new Error("Supabase bağlantısı tanımlı değil. SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY ekleyin.");
  }
  return supabase;
}

async function run(builder) {
  const { data, error, count } = await builder;
  if (error) throw new Error(error.message);
  return { data, count };
}

async function maybe(builder) {
  const { data, error } = await builder;
  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return data || null;
}

function categoryFromRow(row) {
  if (!row) return null;
  return { ...row, active: Boolean(row.active), sort_order: Number(row.sort_order || 0) };
}

function productPayload(product) {
  return {
    category_id: product.categoryId,
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    description: product.description,
    price: product.price,
    compare_price: product.comparePrice,
    stock: product.stock,
    images: product.images,
    sizes: product.sizes,
    colors: product.colors,
    variant_images: product.variantImages,
    featured: product.featured,
    active: product.active
  };
}

function orderPayload(order) {
  return {
    user_id: order.userId,
    order_no: order.orderNo,
    customer_name: order.customerName,
    email: order.email,
    phone: order.phone,
    address: order.address,
    city: order.city,
    district: order.district,
    neighborhood: order.neighborhood,
    street: order.street,
    building_no: order.buildingNo,
    floor: order.floor,
    apartment_no: order.apartmentNo,
    postal_code: order.postalCode,
    notes: order.notes,
    payment_method: order.paymentMethod,
    status: order.status,
    subtotal: order.subtotal,
    shipping: order.shipping,
    total: order.total,
    items: order.items
  };
}

function orderSort(query, sort) {
  if (sort === "priceAsc") return query.order("price", { ascending: true }).order("created_at", { ascending: false });
  if (sort === "priceDesc") return query.order("price", { ascending: false }).order("created_at", { ascending: false });
  if (sort === "newest") return query.order("created_at", { ascending: false });
  return query.order("featured", { ascending: false }).order("created_at", { ascending: false });
}

async function countRows(table, configure = (query) => query) {
  const builder = configure(client().from(table).select("id", { count: "exact", head: true }));
  const { error, count } = await builder;
  if (error) throw new Error(error.message);
  return count || 0;
}

export async function getSettings() {
  const { data } = await run(client().from("settings").select("key, value"));
  return Object.fromEntries(data.map((row) => [row.key, safeJson(row.value, row.value)]));
}

export async function getStore() {
  const [{ data: categories }, { data: products }, settings] = await Promise.all([
    run(client().from("categories").select("*").eq("active", true).order("sort_order").order("name")),
    run(
      client()
        .from("products")
        .select(productSelect)
        .eq("active", true)
        .order("featured", { ascending: false })
        .order("created_at", { ascending: false })
    ),
    getSettings()
  ]);
  return {
    settings,
    categories: categories.map(categoryFromRow),
    products: products.map(toProduct)
  };
}

export async function listProducts({ category, search, sort } = {}) {
  const select = category ? "*, categories!inner(name, slug)" : productSelect;
  let query = client().from("products").select(select).eq("active", true);
  if (category) query = query.eq("categories.slug", String(category));
  if (search) {
    const term = String(search).replace(/[,%]/g, " ").trim();
    if (term) query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%`);
  }
  const { data } = await run(orderSort(query, sort));
  return data.map(toProduct);
}

export async function getProductBySlug(slug) {
  return toProduct(await maybe(
    client().from("products").select(productSelect).eq("slug", slug).eq("active", true).maybeSingle()
  ));
}

export async function getProductForOrder(id) {
  return toProduct(await maybe(
    client()
      .from("products")
      .select("id, name, slug, price, stock, images, variant_images, active")
      .eq("id", Number(id))
      .eq("active", true)
      .maybeSingle()
  ));
}

export async function getUserByEmail(email, role = null) {
  let query = client().from("users").select("*").eq("email", email);
  if (role) query = query.eq("role", role);
  return maybe(query.maybeSingle());
}

export async function getUserById(id) {
  return maybe(client().from("users").select("*").eq("id", Number(id)).maybeSingle());
}

export async function createUser({ email, name, passwordHash, role }) {
  const { data } = await run(
    client()
      .from("users")
      .insert({ email, name, password_hash: passwordHash, role })
      .select("*")
      .single()
  );
  return data;
}

export async function updateUserEmailVerified(id) {
  const { data } = await run(
    client()
      .from("users")
      .update({ email_verified_at: new Date().toISOString() })
      .eq("id", Number(id))
      .select("*")
      .single()
  );
  return data;
}

export async function updateCustomerProfile({ id, name, phone, email, clearEmailVerification }) {
  const payload = { name, phone, email };
  const { data } = await run(
    client().from("users").update(payload).eq("id", Number(id)).select("*").single()
  );
  return data;
}

export async function updateUserPassword(id, passwordHash) {
  await run(client().from("users").update({ password_hash: passwordHash }).eq("id", Number(id)));
}

export async function createSession({ token, userId, expiresAt }) {
  await run(client().from("sessions").insert({ token, user_id: Number(userId), expires_at: expiresAt }));
}

export async function deleteSession(token) {
  await run(client().from("sessions").delete().eq("token", token));
}

export async function deleteOtherSessions(userId, keepToken) {
  let query = client().from("sessions").delete().eq("user_id", Number(userId));
  if (keepToken) query = query.neq("token", keepToken);
  await run(query);
}

export async function getSessionUser(token, role) {
  if (!token) return null;
  const session = await maybe(
    client()
      .from("sessions")
      .select("token, expires_at, users(id, email, name, phone, email_verified_at, role)")
      .eq("token", token)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle()
  );
  const user = session?.users;
  if (!user || user.role !== role) return null;
  return { ...user };
}

export async function uniqueSlug(table, desired, currentId = null) {
  const base = slugify(desired) || `${table}-${Date.now()}`;
  let candidate = base;
  let counter = 2;
  while (true) {
    let query = client().from(table).select("id").eq("slug", candidate).limit(1);
    if (currentId) query = query.neq("id", Number(currentId));
    const { data } = await run(query);
    if (!data.length) return candidate;
    candidate = `${base}-${counter++}`;
  }
}

export async function normalizeProductBody(body, currentId = null) {
  const name = String(body.name || "").trim();
  if (!name) throw new Error("Ürün adı zorunludur.");

  return {
    categoryId: body.categoryId ? Number(body.categoryId) : null,
    name,
    slug: await uniqueSlug("products", body.slug || name, currentId),
    sku: String(body.sku || "").trim(),
    description: String(body.description || "").trim(),
    price: Number(body.price || 0),
    comparePrice: body.comparePrice === "" || body.comparePrice == null ? null : Number(body.comparePrice),
    stock: Math.max(0, Number(body.stock || 0)),
    images: Array.isArray(body.images) ? body.images.filter(Boolean) : [],
    sizes: Array.isArray(body.sizes) ? body.sizes.filter(Boolean) : [],
    colors: Array.isArray(body.colors) ? body.colors.filter(Boolean) : [],
    variantImages: Array.isArray(body.variantImages)
      ? body.variantImages
          .map((variant) => ({
            color: String(variant.color || "").trim(),
            size: String(variant.size || "").trim(),
            images: Array.isArray(variant.images) ? variant.images.filter(Boolean) : []
          }))
          .filter((variant) => variant.images.length)
      : [],
    featured: Boolean(body.featured),
    active: body.active === false ? false : true
  };
}

export async function listFavorites(userId) {
  const { data: favorites } = await run(
    client().from("favorites").select("product_id, created_at").eq("user_id", Number(userId)).order("created_at", { ascending: false })
  );
  const ids = favorites.map((favorite) => Number(favorite.product_id));
  if (!ids.length) return [];
  const { data: products } = await run(
    client().from("products").select(productSelect).in("id", ids).eq("active", true)
  );
  const byId = new Map(products.map((product) => [Number(product.id), toProduct(product)]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
}

export async function addFavorite(userId, productId) {
  const product = await maybe(
    client().from("products").select("id").eq("id", Number(productId)).eq("active", true).maybeSingle()
  );
  if (!product) return null;
  await run(
    client()
      .from("favorites")
      .upsert({ user_id: Number(userId), product_id: Number(product.id) }, { onConflict: "user_id,product_id" })
  );
  return product;
}

export async function removeFavorite(userId, productId) {
  await run(
    client().from("favorites").delete().eq("user_id", Number(userId)).eq("product_id", Number(productId))
  );
}

export async function decrementProductStock(productId, quantity, knownStock = null) {
  const current = knownStock == null
    ? await maybe(client().from("products").select("stock").eq("id", Number(productId)).maybeSingle())
    : { stock: knownStock };
  const nextStock = Math.max(0, Number(current?.stock || 0) - Number(quantity || 0));
  await run(
    client()
      .from("products")
      .update({ stock: nextStock, updated_at: new Date().toISOString() })
      .eq("id", Number(productId))
  );
}

export async function restoreProductStock(productId, quantity) {
  const current = await maybe(client().from("products").select("stock").eq("id", Number(productId)).maybeSingle());
  const nextStock = Number(current?.stock || 0) + Number(quantity || 0);
  await run(
    client()
      .from("products")
      .update({ stock: nextStock, updated_at: new Date().toISOString() })
      .eq("id", Number(productId))
  );
}

export async function createOrder(order) {
  const { data } = await run(client().from("orders").insert(orderPayload(order)).select("*").single());
  return toOrder(data);
}

export async function getOrderById(id) {
  return toOrder(await maybe(client().from("orders").select("*").eq("id", Number(id)).maybeSingle()));
}

export async function getOrderByOrderNo(orderNo) {
  return toOrder(await maybe(client().from("orders").select("*").eq("order_no", orderNo).maybeSingle()));
}

export async function getOrderByOrderNoForCustomer(orderNo, customer) {
  return toOrder(await maybe(
    client()
      .from("orders")
      .select("*")
      .eq("order_no", orderNo)
      .or(`user_id.eq.${Number(customer.id)},email.eq.${customer.email}`)
      .maybeSingle()
  ));
}

export async function listCustomerOrders(customer) {
  const { data } = await run(
    client()
      .from("orders")
      .select("*")
      .or(`user_id.eq.${Number(customer.id)},email.eq.${customer.email}`)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
  );
  return data.map(toOrder);
}

export async function updateOrder(id, payload) {
  const { data } = await run(
    client().from("orders").update(payload).eq("id", Number(id)).select("*").single()
  );
  return toOrder(data);
}

export async function listAdminProducts() {
  const { data } = await run(
    client().from("products").select(productSelect).order("created_at", { ascending: false })
  );
  return data.map(toProduct);
}

export async function createProduct(body) {
  const product = await normalizeProductBody(body);
  const { data } = await run(
    client().from("products").insert(productPayload(product)).select(productSelect).single()
  );
  return toProduct(data);
}

export async function updateProduct(id, body) {
  const product = await normalizeProductBody(body, id);
  const { data } = await run(
    client()
      .from("products")
      .update({ ...productPayload(product), updated_at: new Date().toISOString() })
      .eq("id", Number(id))
      .select(productSelect)
      .single()
  );
  return toProduct(data);
}

export async function deleteProduct(id) {
  await run(client().from("products").delete().eq("id", Number(id)));
}

export async function listAdminCategories() {
  const { data } = await run(client().from("categories").select("*").order("sort_order").order("name"));
  return data.map(categoryFromRow);
}

export async function createCategory(body) {
  const name = String(body.name || "").trim();
  if (!name) throw new Error("Kategori adı zorunludur.");
  const slug = await uniqueSlug("categories", body.slug || name);
  const { data } = await run(
    client()
      .from("categories")
      .insert({
        name,
        slug,
        description: String(body.description || ""),
        image: String(body.image || ""),
        active: body.active === false ? false : true,
        sort_order: Number(body.sortOrder || 0)
      })
      .select("*")
      .single()
  );
  return categoryFromRow(data);
}

export async function updateCategory(id, body) {
  const name = String(body.name || "").trim();
  if (!name) throw new Error("Kategori adı zorunludur.");
  const slug = await uniqueSlug("categories", body.slug || name, id);
  const { data } = await run(
    client()
      .from("categories")
      .update({
        name,
        slug,
        description: String(body.description || ""),
        image: String(body.image || ""),
        active: body.active === false ? false : true,
        sort_order: Number(body.sortOrder || 0)
      })
      .eq("id", Number(id))
      .select("*")
      .single()
  );
  return categoryFromRow(data);
}

export async function deleteCategory(id) {
  await run(client().from("categories").delete().eq("id", Number(id)));
}

export async function listAdminOrders() {
  const { data } = await run(client().from("orders").select("*").order("created_at", { ascending: false }));
  return data.map(toOrder);
}

export async function getAdminStats() {
  const [productCount, lowStock, orderCount, { data: revenueRows }, { data: recentRows }] = await Promise.all([
    countRows("products"),
    countRows("products", (query) => query.eq("active", true).lte("stock", 5)),
    countRows("orders"),
    run(client().from("orders").select("total, status, created_at")),
    run(client().from("orders").select("*").order("created_at", { ascending: false }).limit(6))
  ]);
  const now = Date.now();
  const cutoffs = {
    week: now - 7 * 24 * 60 * 60 * 1000,
    month: now - 30 * 24 * 60 * 60 * 1000,
    year: now - 365 * 24 * 60 * 60 * 1000
  };
  const paidRows = revenueRows.filter((row) => row.status !== cancelledStatus);
  const totalFor = (from) => paidRows
    .filter((row) => !from || new Date(row.created_at).getTime() >= from)
    .reduce((sum, row) => sum + Number(row.total || 0), 0);
  const revenuePeriods = {
    week: totalFor(cutoffs.week),
    month: totalFor(cutoffs.month),
    year: totalFor(cutoffs.year),
    all: totalFor()
  };
  return {
    productCount,
    lowStock,
    orderCount,
    revenue: revenuePeriods.all,
    revenuePeriods,
    recentOrders: recentRows.map(toOrder)
  };
}

export async function upsertSettings(values) {
  const rows = Object.entries(values).map(([key, value]) => ({ key, value }));
  if (rows.length) await run(client().from("settings").upsert(rows, { onConflict: "key" }));
  return getSettings();
}



