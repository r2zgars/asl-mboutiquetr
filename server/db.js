import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, "..", "data");
mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(join(dataDir, "store.db"));
db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    email_verified_at TEXT,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS favorites (
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, product_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  );


  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    image TEXT NOT NULL DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    sku TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    price REAL NOT NULL DEFAULT 0,
    compare_price REAL,
    stock INTEGER NOT NULL DEFAULT 0,
    images TEXT NOT NULL DEFAULT '[]',
    sizes TEXT NOT NULL DEFAULT '[]',
    colors TEXT NOT NULL DEFAULT '[]',
    variant_images TEXT NOT NULL DEFAULT '[]',
    featured INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    order_no TEXT NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    district TEXT NOT NULL DEFAULT '',
    neighborhood TEXT NOT NULL DEFAULT '',
    street TEXT NOT NULL DEFAULT '',
    building_no TEXT NOT NULL DEFAULT '',
    floor TEXT NOT NULL DEFAULT '',
    apartment_no TEXT NOT NULL DEFAULT '',
    postal_code TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    payment_method TEXT NOT NULL DEFAULT 'WhatsApp',
    status TEXT NOT NULL DEFAULT 'Yeni',
    tracking_code TEXT NOT NULL DEFAULT '',
    cancel_reason TEXT NOT NULL DEFAULT '',
    subtotal REAL NOT NULL,
    shipping REAL NOT NULL,
    total REAL NOT NULL,
    items TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

const productColumns = db.prepare("PRAGMA table_info(products)").all().map((column) => column.name);
if (!productColumns.includes("variant_images")) {
  db.exec("ALTER TABLE products ADD COLUMN variant_images TEXT NOT NULL DEFAULT '[]'");
}

const userColumns = db.prepare("PRAGMA table_info(users)").all().map((column) => column.name);
if (!userColumns.includes("role")) {
  db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'customer'");
}
if (!userColumns.includes("phone")) {
  db.exec("ALTER TABLE users ADD COLUMN phone TEXT NOT NULL DEFAULT ''");
}
if (!userColumns.includes("email_verified_at")) {
  db.exec("ALTER TABLE users ADD COLUMN email_verified_at TEXT");
  db.exec("UPDATE users SET email_verified_at = CURRENT_TIMESTAMP WHERE role = 'customer'");
}
db.prepare("UPDATE users SET role = 'admin' WHERE email = ?").run("admin@aslimboutique.com");
db.prepare("UPDATE users SET email = 'aslimboutique@gmail.com' WHERE role = 'admin' AND email = 'admin@aslimboutique.com'").run();

const orderColumns = db.prepare("PRAGMA table_info(orders)").all().map((column) => column.name);
if (!orderColumns.includes("user_id")) {
  db.exec("ALTER TABLE orders ADD COLUMN user_id INTEGER");
}
const orderColumnDefaults = {
  neighborhood: "TEXT NOT NULL DEFAULT ''",
  street: "TEXT NOT NULL DEFAULT ''",
  building_no: "TEXT NOT NULL DEFAULT ''",
  floor: "TEXT NOT NULL DEFAULT ''",
  apartment_no: "TEXT NOT NULL DEFAULT ''",
  tracking_code: "TEXT NOT NULL DEFAULT ''",
  cancel_reason: "TEXT NOT NULL DEFAULT ''"
};
for (const [column, definition] of Object.entries(orderColumnDefaults)) {
  if (!orderColumns.includes(column)) {
    db.exec(`ALTER TABLE orders ADD COLUMN ${column} ${definition}`);
  }
}

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

export function verifyPassword(password, stored) {
  const [salt, expectedHex] = stored.split(":");
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function safeJson(value, fallback = []) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function toProduct(row) {
  if (!row) return null;
  return {
    ...row,
    featured: Boolean(row.featured),
    active: Boolean(row.active),
    images: safeJson(row.images),
    sizes: safeJson(row.sizes),
    colors: safeJson(row.colors),
    variant_images: safeJson(row.variant_images)
  };
}

export function getSettings() {
  return Object.fromEntries(
    db.prepare("SELECT key, value FROM settings").all().map((row) => [row.key, safeJson(row.value, row.value)])
  );
}

function seed() {
  if (!db.prepare("SELECT COUNT(*) AS count FROM users").get().count) {
    db.prepare("INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, 'admin')").run(
      "aslimboutique@gmail.com",
      "Aslım Yönetici",
      hashPassword("iremtetik2346")
    );
  }

  if (!db.prepare("SELECT COUNT(*) AS count FROM settings").get().count) {
    const defaults = {
      storeName: "ASLIM BOUTIQUE",
      announcement: "AÇILIŞA ÖZEL İNDİRİM",
      announcements: ["AÇILIŞA ÖZEL İNDİRİM"],
      logo: "/images/logo.webp",
      heroTitle: "Zarafetin yeni hali",
      heroSubtitle: "Günün her anına eşlik eden seçkin parçaları keşfedin.",
      heroButton: "KOLEKSİYONU KEŞFET",
      heroImages: ["/images/hero-scarf.webp", "/images/hero-vest.webp", "/images/hero-bag.webp"],
      authImage: "/images/hero-vest.webp",
      authEyebrow: "ASLIM BOUTIQUE",
      authLoginTitle: "Tekrar hoş geldiniz.",
      authLoginText: "Hesabınıza giriş yaparak favorilerinize devam edin.",
      authRegisterTitle: "Aramıza katılın.",
      authRegisterText: "Favorilerinizi saklamak için hesabınızı oluşturun.",
      phone: "+90 555 555 55 55",
      email: "info@aslimboutique.com",
      instagram: "https://instagram.com/aslimboutiquetr",
      whatsapp: "905555555555",
      address: "İstanbul, Türkiye",
      shippingFee: 89.9,
      freeShippingThreshold: 1500,
      returnDays: 15,
      trustTitle1: "Güvenli alışveriş",
      trustText1: "256 Bit SSL koruması",
      trustTitle2: "Hızlı gönderim",
      trustText2: "Özenli ve takipli teslimat",
      trustTitle3: "Kolay iade",
      trustText3: "3 iş günü içinde",
      faqItems: [
        {
          question: "Nasıl satın alabilirim?",
          answer: "Ürün sayfasındaki Satın Al butonu sizi WhatsApp görüşmesine yönlendirir."
        }
      ],
      footerNote: "Özenle seçilmiş zamansız parçalar.",
      primaryColor: "#0a0a0a",
      accentColor: "#a4743b"
    };
    const statement = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)");
    for (const [key, value] of Object.entries(defaults)) statement.run(key, JSON.stringify(value));
  }

  const existingAnnouncement = getSettings().announcement || "AÇILIŞA ÖZEL İNDİRİM";
  db.prepare(`
    INSERT INTO settings (key, value) VALUES ('announcements', ?)
    ON CONFLICT(key) DO NOTHING
  `).run(JSON.stringify([existingAnnouncement]));

  if (!db.prepare("SELECT COUNT(*) AS count FROM categories").get().count) {
    const categories = [
      ["NEW DROP", "new-drop", "En yeni seçkimiz", "/images/hero-scarf.webp", 1],
      ["ÜST GİYİM", "ust-giyim", "Yelek, gömlek ve tunikler", "/images/vest.webp", 2],
      ["ALT GİYİM", "alt-giyim", "Rahat ve zamansız alt giyim", "/images/hero-vest.webp", 3],
      ["AKSESUAR", "aksesuar", "Görünümünüzü tamamlayan detaylar", "/images/bag-white.webp", 4],
      ["ÇANTA", "canta", "Günlük ve özel çanta seçkisi", "/images/bag-navy.webp", 5],
      ["ŞAL", "sal", "Yumuşak dokulu şal koleksiyonu", "/images/hero-scarf.webp", 6],
      ["TAKIM", "takim", "Birlikte kusursuz duran takımlar", "/images/hero-vest.webp", 7]
    ];
    const statement = db.prepare(
      "INSERT INTO categories (name, slug, description, image, sort_order) VALUES (?, ?, ?, ?, ?)"
    );
    for (const category of categories) statement.run(...category);
  }

  if (!db.prepare("SELECT COUNT(*) AS count FROM products").get().count) {
    const categoryId = (slug) => db.prepare("SELECT id FROM categories WHERE slug = ?").get(slug).id;
    const products = [
      {
        category: "ust-giyim",
        name: "Kruvaze Tokalı Yelek",
        price: 1299.9,
        comparePrice: 1599.9,
        stock: 14,
        image: "/images/vest.webp",
        sizes: ["S", "M", "L"],
        colors: ["Bordo", "Siyah"],
        description: "Modern kruvaze kesimi ve metal toka detayıyla zamansız bir katman.",
        featured: 1
      },
      {
        category: "canta",
        name: "Doku Detaylı Beyaz Çanta",
        price: 1149.9,
        comparePrice: null,
        stock: 9,
        image: "/images/bag-white.webp",
        sizes: ["Standart"],
        colors: ["Kırık Beyaz"],
        description: "Geniş iç hacmi, zarif dokusu ve çıkarılabilir aksesuar çantasıyla günlük kullanım için ideal.",
        featured: 1
      },
      {
        category: "canta",
        name: "Lacivert Şehir Çantası",
        price: 1399.9,
        comparePrice: 1699.9,
        stock: 7,
        image: "/images/bag-navy.webp",
        sizes: ["Standart"],
        colors: ["Lacivert"],
        description: "Güçlü formu ve ayarlanabilir askısıyla şehir temposuna uyum sağlar.",
        featured: 1
      },
      {
        category: "sal",
        name: "Monokrom Çiçek Şal",
        price: 449.9,
        comparePrice: null,
        stock: 21,
        image: "/images/hero-scarf.webp",
        sizes: ["Standart"],
        colors: ["Siyah"],
        description: "Akışkan dokusu ve büyük çiçek deseniyle sade kombinlere güçlü bir dokunuş.",
        featured: 1
      },
      {
        category: "takim",
        name: "Keten Dokulu İkili Takım",
        price: 2199.9,
        comparePrice: 2599.9,
        stock: 11,
        image: "/images/hero-vest.webp",
        sizes: ["S", "M", "L", "XL"],
        colors: ["Taş", "Kum"],
        description: "Rahat kalıbı ve doğal renk paletiyle gün boyu zahmetsiz şıklık.",
        featured: 1
      },
      {
        category: "new-drop",
        name: "Asimetrik Kesim Bluz",
        price: 999.9,
        comparePrice: null,
        stock: 18,
        image: "/images/vest.webp",
        sizes: ["S", "M", "L"],
        colors: ["Bordo", "Ekru"],
        description: "Minimal çizgileri yumuşak bir asimetriyle buluşturan yeni sezon bluz.",
        featured: 0
      }
    ];

    const statement = db.prepare(`
      INSERT INTO products (
        category_id, name, slug, sku, description, price, compare_price, stock,
        images, sizes, colors, featured, active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    products.forEach((product, index) => {
      statement.run(
        categoryId(product.category),
        product.name,
        slugify(product.name),
        `ASL-${String(index + 1).padStart(4, "0")}`,
        product.description,
        product.price,
        product.comparePrice,
        product.stock,
        JSON.stringify([product.image]),
        JSON.stringify(product.sizes),
        JSON.stringify(product.colors),
        product.featured
      );
    });
  }
}

seed();

