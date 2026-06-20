import { Fragment, useEffect, useState } from "react";
import {
  BarChart3,
  Boxes,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  ExternalLink,
  ImagePlus,
  LayoutDashboard,
  Mail,
  MapPin,
  LogOut,
  Menu,
  Package,
  Pencil,
  Phone,
  Plus,
  Save,
  Settings,
  ShoppingCart,
  StickyNote,
  Tags,
  Trash2,
  X
} from "lucide-react";
import { Link, NavLink, Outlet, useNavigate, useOutletContext } from "react-router-dom";
import { api, formatDate, formatPrice } from "./api";
import { useStore } from "./store";

export function AdminLogin() {
  const { settings, refreshAuth } = useStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "aslimboutique@gmail.com", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api("/api/admin/login", { method: "POST", body: JSON.stringify(form) });
      await refreshAuth();
      navigate("/admin");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-login">
      <Link to="/" className="admin-login-brand"><img src={settings.logo || "/images/logo.webp"} alt="Aslım Boutique" /></Link>
      <form onSubmit={submit}>
        <p className="eyebrow">YÖNETİM PANELİ</p>
        <h1>Tekrar hoş geldiniz.</h1>
        <p>Mağazanızı yönetmek için hesabınıza giriş yapın.</p>
        {error && <div className="form-error">{error}</div>}
        <label>E-posta<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} autoComplete="email" required /></label>
        <label>Şifre<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} autoComplete="current-password" required /></label>
        <button className="button dark full" disabled={loading}>{loading ? "GİRİŞ YAPILIYOR..." : "GİRİŞ YAP"}</button>
        <small>Yönetim paneline e-posta adresiniz ve şifrenizle giriş yapın.</small>
      </form>
    </div>
  );
}

export function AdminLayout() {
  const { settings, refreshAuth } = useStore();
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    api("/api/admin/me")
      .then(setAdmin)
      .catch(() => navigate("/admin/giris"))
      .finally(() => setLoading(false));
  }, [navigate]);

  async function logout() {
    await api("/api/admin/logout", { method: "POST" });
    await refreshAuth();
    navigate("/admin/giris");
  }

  if (loading) return <div className="admin-loading">Panel hazırlanıyor...</div>;
  if (!admin) return null;

  const links = [
    ["/admin", "Genel Bakış", LayoutDashboard, true],
    ["/admin/urunler", "Ürünler", Package],
    ["/admin/kategoriler", "Kategoriler", Tags],
    ["/admin/siparisler", "Siparişler", ShoppingCart],
    ["/admin/ayarlar", "Site Ayarları", Settings]
  ];

  return (
    <div className="admin-shell">
      <aside className={menuOpen ? "open" : ""}>
        <div className="admin-logo">
          <img src={settings.logo || "/images/logo.webp"} alt="Aslım Boutique" />
          <button className="icon-button admin-menu-close" onClick={() => setMenuOpen(false)}><X /></button>
        </div>
        <nav>
          {links.map(([to, label, Icon, end]) => (
            <NavLink key={to} to={to} end={end} onClick={() => setMenuOpen(false)}>
              <Icon size={19} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <a href="/" target="_blank"><ExternalLink size={18} /> Mağazayı Gör</a>
          <button onClick={logout}><LogOut size={18} /> Çıkış Yap</button>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <button className="icon-button admin-menu-toggle" onClick={() => setMenuOpen(true)}><Menu /></button>
          <div><span>Mağaza yönetimi</span><strong>{admin.name}</strong></div>
        </header>
        <Outlet context={{ admin }} />
      </div>
    </div>
  );
}

export function AdminDashboard() {
  const [stats, setStats] = useState(null);
  useEffect(() => { api("/api/admin/stats").then(setStats); }, []);
  if (!stats) return <AdminPageLoading />;

  const cards = [
    ["Toplam ürün", stats.productCount, Boxes, "Ürün kataloğunuz"],
    ["Toplam sipariş", stats.orderCount, ShoppingCart, "Tüm zamanlar"],
    ["Tüm ciro", formatPrice(stats.revenuePeriods?.all ?? stats.revenue), BarChart3, "İptaller hariç"],
    ["Kritik stok", stats.lowStock, CircleAlert, "5 adet ve altı"]
  ];
  const revenueCards = [
    ["1 hafta", stats.revenuePeriods?.week ?? 0],
    ["1 ay", stats.revenuePeriods?.month ?? 0],
    ["1 yıl", stats.revenuePeriods?.year ?? 0],
    ["Tüm zamanlar", stats.revenuePeriods?.all ?? stats.revenue]
  ];

  return (
    <AdminPage title="Genel Bakış" subtitle="Mağazanızın bugünkü durumuna hızlıca göz atın.">
      <div className="stat-grid">
        {cards.map(([label, value, Icon, note]) => (
          <article className="stat-card" key={label}>
            <div><span>{label}</span><Icon /></div>
            <strong>{value}</strong>
            <small>{note}</small>
          </article>
        ))}
      </div>
      <section className="admin-card revenue-card">
        <div className="admin-card-head">
          <div><h2>Ciro takibi</h2><p>İptal siparişler hariç dönemsel gelir</p></div>
          <BarChart3 size={20} />
        </div>
        <div className="revenue-grid">
          {revenueCards.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{formatPrice(value)}</strong>
            </div>
          ))}
        </div>
      </section>
      <section className="admin-card">
        <div className="admin-card-head">
          <div><h2>Son siparişler</h2><p>En güncel müşteri siparişleri</p></div>
          <Link to="/admin/siparisler">Tümünü gör <ChevronRight size={17} /></Link>
        </div>
        <OrdersTable orders={stats.recentOrders} compact />
      </section>
    </AdminPage>
  );
}

export function AdminProducts() {
  const { refreshStore } = useStore();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);

  async function load() {
    const [productData, categoryData] = await Promise.all([
      api("/api/admin/products"),
      api("/api/admin/categories")
    ]);
    setProducts(productData);
    setCategories(categoryData);
  }

  useEffect(() => { load(); }, []);

  async function remove(product) {
    if (!window.confirm(`“${product.name}” ürününü silmek istediğinizden emin misiniz?`)) return;
    await api(`/api/admin/products/${product.id}`, { method: "DELETE" });
    await load();
    refreshStore();
  }

  return (
    <AdminPage
      title="Ürünler"
      subtitle={`${products.length} ürün katalogda kayıtlı.`}
      action={<button className="admin-primary" onClick={() => { setEditing(null); setOpen(true); }}><Plus size={18} /> Yeni ürün</button>}
    >
      <section className="admin-card table-card">
        <div className="admin-table-wrap">
          <table className="admin-table product-table">
            <thead><tr><th>Ürün</th><th>Kategori</th><th>Fiyat</th><th>Stok</th><th>Durum</th><th /></tr></thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td><div className="table-product"><img src={product.images?.[0] || "/images/logo.webp"} alt="" /><span><strong>{product.name}</strong><small>{product.sku}</small></span></div></td>
                  <td>{product.category_name || "Kategorisiz"}</td>
                  <td><strong>{formatPrice(product.price)}</strong></td>
                  <td><span className={product.stock <= 5 ? "stock low" : "stock"}>{product.stock}</span></td>
                  <td><StatusBadge value={product.active ? "Aktif" : "Pasif"} /></td>
                  <td><div className="row-actions"><button onClick={() => { setEditing(product); setOpen(true); }}><Pencil size={17} /></button><button onClick={() => remove(product)}><Trash2 size={17} /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {open && <ProductModal product={editing} categories={categories} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); load(); refreshStore(); }} />}
    </AdminPage>
  );
}

function optionList(value) {
  return (Array.isArray(value) ? value : String(value || "").split(","))
    .map((item) => item.trim())
    .filter(Boolean);
}

const maxUploadBytes = 3.5 * 1024 * 1024;
const maxImageSide = 1800;

function blobToCanvasBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Görsel okunamadı. Farklı bir fotoğraf deneyin."));
    };
    image.src = url;
  });
}

async function prepareImageFile(file) {
  if (!file.type.startsWith("image/")) throw new Error("Lütfen geçerli bir görsel seçin.");
  if (file.type === "image/gif") {
    if (file.size > maxUploadBytes) throw new Error("GIF dosyası çok büyük. Daha küçük bir görsel seçin.");
    return file;
  }

  const image = await loadImageFile(file);
  const scale = Math.min(1, maxImageSide / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  if (file.size <= maxUploadBytes && scale === 1) return file;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, width, height);

  let bestBlob = null;
  for (const quality of [0.84, 0.74, 0.64, 0.54]) {
    const blob = await blobToCanvasBlob(canvas, "image/webp", quality);
    if (!blob) continue;
    bestBlob = blob;
    if (blob.size <= maxUploadBytes) break;
  }
  if (!bestBlob || bestBlob.size > maxUploadBytes) {
    throw new Error("Görsel çok büyük. Fotoğrafı biraz kırpıp tekrar deneyin.");
  }

  const name = file.name.replace(/\.[^.]+$/, "") || "gorsel";
  return new File([bestBlob], `${name}.webp`, { type: bestBlob.type || "image/webp" });
}

async function imageFormData(file) {
  const prepared = await prepareImageFile(file);
  const body = new FormData();
  body.append("image", prepared);
  return body;
}

function ProductModal({ product, categories, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: product?.name || "",
    slug: product?.slug || "",
    sku: product?.sku || "",
    categoryId: product?.category_id || "",
    description: product?.description || "",
    price: product?.price ?? "",
    comparePrice: product?.compare_price ?? "",
    stock: product?.stock ?? 0,
    images: product?.images || [],
    sizes: product?.sizes || [],
    colors: product?.colors || [],
    variantImages: product?.variant_images || [],
    purchaseUrl: product?.purchase_url || "",
    featured: product?.featured || false,
    active: product?.active ?? true
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [variantColor, setVariantColor] = useState("");
  const [variantSize, setVariantSize] = useState("");

  function update(event) {
    const { name, value, type, checked } = event.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  }

  async function uploadImage(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const body = await imageFormData(file);
      const result = await api("/api/admin/upload", { method: "POST", body });
      setForm((current) => ({ ...current, images: [...current.images, result.url] }));
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setUploading(false);
    }
  }

  async function uploadVariantImage(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!variantColor && !variantSize) {
      setError("Varyant görseli için en az bir renk veya beden seçin.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const body = await imageFormData(file);
      const result = await api("/api/admin/upload", { method: "POST", body });
      setForm((current) => {
        const existing = current.variantImages.find(
          (variant) => variant.color === variantColor && variant.size === variantSize
        );
        const variantImages = existing
          ? current.variantImages.map((variant) =>
              variant === existing ? { ...variant, images: [...variant.images, result.url] } : variant
            )
          : [...current.variantImages, { color: variantColor, size: variantSize, images: [result.url] }];
        return { ...current, variantImages };
      });
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setUploading(false);
    }
  }

  function removeVariantImage(color, size, image) {
    setForm((current) => ({
      ...current,
      variantImages: current.variantImages
        .map((variant) =>
          variant.color === color && variant.size === size
            ? { ...variant, images: variant.images.filter((item) => item !== image) }
            : variant
        )
        .filter((variant) => variant.images.length)
    }));
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api(product ? `/api/admin/products/${product.id}` : "/api/admin/products", {
        method: product ? "PUT" : "POST",
        body: JSON.stringify({
          ...form,
          sizes: typeof form.sizes === "string" ? form.sizes.split(",").map((item) => item.trim()) : form.sizes,
          colors: typeof form.colors === "string" ? form.colors.split(",").map((item) => item.trim()) : form.colors
        })
      });
      onSaved();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={product ? "Ürünü düzenle" : "Yeni ürün ekle"} onClose={onClose}>
      <form className="admin-form" onSubmit={submit}>
        {error && <div className="form-error">{error}</div>}
        <div className="form-grid">
          <label className="wide">Ürün adı<input name="name" value={form.name} onChange={update} required /></label>
          <label>URL kısa adı<input name="slug" value={form.slug} onChange={update} placeholder="Otomatik oluşturulur" /></label>
          <label>Stok kodu<input name="sku" value={form.sku} onChange={update} /></label>
          <label>Kategori<select name="categoryId" value={form.categoryId} onChange={update}><option value="">Kategorisiz</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label>Stok<input type="number" min="0" name="stock" value={form.stock} onChange={update} /></label>
          <label>Satış fiyatı<input type="number" min="0" step="0.01" name="price" value={form.price} onChange={update} required /></label>
          <label>İndirim öncesi fiyat<input type="number" min="0" step="0.01" name="comparePrice" value={form.comparePrice} onChange={update} /></label>
          <label className="wide">Satın al linki<input type="url" name="purchaseUrl" value={form.purchaseUrl} onChange={update} placeholder="https://..." /></label>
          <label className="wide">Açıklama<textarea name="description" rows="4" value={form.description} onChange={update} /></label>
          <label>Bedenler<input value={Array.isArray(form.sizes) ? form.sizes.join(", ") : form.sizes} onChange={(event) => setForm({ ...form, sizes: event.target.value })} placeholder="S, M, L" /></label>
          <label>Renkler<input value={Array.isArray(form.colors) ? form.colors.join(", ") : form.colors} onChange={(event) => setForm({ ...form, colors: event.target.value })} placeholder="Siyah, Ekru" /></label>
        </div>
        <div className="image-manager">
          <div className="image-manager-head"><strong>Ürün görselleri</strong><label className="upload-button"><ImagePlus size={17} /> {uploading ? "Yükleniyor..." : "Görsel yükle"}<input type="file" accept="image/*" onChange={uploadImage} disabled={uploading} /></label></div>
          <div className="uploaded-images">
            {form.images.map((image, index) => (
              <div key={`${image}-${index}`}><img src={image} alt="" /><button type="button" onClick={() => setForm({ ...form, images: form.images.filter((_, itemIndex) => itemIndex !== index) })}><X size={15} /></button></div>
            ))}
          </div>
        </div>
        <div className="image-manager variant-image-manager">
          <div className="image-manager-head">
            <div><strong>Renk ve bedene bağlı görseller</strong><small>Seçilen varyantta müşteriye bu görseller gösterilir.</small></div>
          </div>
          <div className="variant-picker">
            <label>Renk<select value={variantColor} onChange={(event) => setVariantColor(event.target.value)}><option value="">Tüm renkler</option>{optionList(form.colors).map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Beden<select value={variantSize} onChange={(event) => setVariantSize(event.target.value)}><option value="">Tüm bedenler</option>{optionList(form.sizes).map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="upload-button variant-upload"><ImagePlus size={17} /> {uploading ? "Yükleniyor..." : "Bu varyanta görsel ekle"}<input type="file" accept="image/*" onChange={uploadVariantImage} disabled={uploading} /></label>
          </div>
          <div className="variant-image-groups">
            {form.variantImages.map((variant) => (
              <div className="variant-image-group" key={`${variant.color}-${variant.size}`}>
                <div><strong>{variant.color || "Tüm renkler"}</strong><span>{variant.size || "Tüm bedenler"}</span></div>
                <div className="uploaded-images">
                  {variant.images.map((image) => (
                    <div key={image}><img src={image} alt="" /><button type="button" onClick={() => removeVariantImage(variant.color, variant.size, image)}><X size={15} /></button></div>
                  ))}
                </div>
              </div>
            ))}
            {!form.variantImages.length && <p className="variant-empty">Henüz varyanta özel görsel eklenmedi.</p>}
          </div>
        </div>
        <div className="check-row">
          <label><input type="checkbox" name="active" checked={form.active} onChange={update} /> Satışta</label>
          <label><input type="checkbox" name="featured" checked={form.featured} onChange={update} /> Anasayfada öne çıkar</label>
        </div>
        <div className="modal-actions"><button type="button" className="admin-secondary" onClick={onClose}>Vazgeç</button><button className="admin-primary" disabled={saving}><Save size={17} /> {saving ? "Kaydediliyor..." : "Kaydet"}</button></div>
      </form>
    </Modal>
  );
}

export function AdminCategories() {
  const { refreshStore } = useStore();
  const [categories, setCategories] = useState([]);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const load = () => api("/api/admin/categories").then(setCategories);
  useEffect(() => { load(); }, []);

  async function remove(category) {
    if (!window.confirm(`“${category.name}” kategorisini silmek istediğinizden emin misiniz?`)) return;
    await api(`/api/admin/categories/${category.id}`, { method: "DELETE" });
    await load();
    refreshStore();
  }

  return (
    <AdminPage title="Kategoriler" subtitle="Mağaza menüsünü ve ürün gruplarını yönetin." action={<button className="admin-primary" onClick={() => { setEditing(null); setOpen(true); }}><Plus size={18} /> Yeni kategori</button>}>
      <div className="category-admin-grid">
        {categories.map((category) => (
          <article className="category-admin-card" key={category.id}>
            <img src={category.image || "/images/logo.webp"} alt="" />
            <div><span>{category.active ? "Yayında" : "Gizli"}</span><h2>{category.name}</h2><p>/{category.slug}</p></div>
            <div className="row-actions"><button onClick={() => { setEditing(category); setOpen(true); }}><Pencil size={17} /></button><button onClick={() => remove(category)}><Trash2 size={17} /></button></div>
          </article>
        ))}
      </div>
      {open && <CategoryModal category={editing} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); load(); refreshStore(); }} />}
    </AdminPage>
  );
}

function CategoryModal({ category, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: category?.name || "",
    slug: category?.slug || "",
    description: category?.description || "",
    image: category?.image || "",
    sortOrder: category?.sort_order || 0,
    active: category?.active ?? true
  });
  const [error, setError] = useState("");

  async function uploadImage(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    try {
      const body = await imageFormData(file);
      const result = await api("/api/admin/upload", { method: "POST", body });
      setForm({ ...form, image: result.url });
    } catch (uploadError) {
      setError(uploadError.message);
    }
  }

  async function submit(event) {
    event.preventDefault();
    try {
      await api(category ? `/api/admin/categories/${category.id}` : "/api/admin/categories", {
        method: category ? "PUT" : "POST",
        body: JSON.stringify(form)
      });
      onSaved();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <Modal title={category ? "Kategoriyi düzenle" : "Yeni kategori"} onClose={onClose}>
      <form className="admin-form" onSubmit={submit}>
        {error && <div className="form-error">{error}</div>}
        <label>Kategori adı<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
        <label>URL kısa adı<input value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} /></label>
        <label>Açıklama<textarea rows="3" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
        <label>Sıralama<input type="number" value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: event.target.value })} /></label>
        <div className="image-manager">
          <div className="image-manager-head"><strong>Kategori görseli</strong><label className="upload-button"><ImagePlus size={17} /> Görsel yükle<input type="file" accept="image/*" onChange={uploadImage} /></label></div>
          {form.image && <div className="category-preview"><img src={form.image} alt="" /></div>}
        </div>
        <div className="check-row"><label><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /> Menüde ve mağazada göster</label></div>
        <div className="modal-actions"><button type="button" className="admin-secondary" onClick={onClose}>Vazgeç</button><button className="admin-primary"><Save size={17} /> Kaydet</button></div>
      </form>
    </Modal>
  );
}

export function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [cancelOrder, setCancelOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelSaving, setCancelSaving] = useState(false);
  const load = () => api("/api/admin/orders").then(setOrders);
  useEffect(() => { load(); }, []);

  async function updateOrder(id, body) {
    await api(`/api/admin/orders/${id}`, { method: "PATCH", body: JSON.stringify(body) });
    await load();
  }

  async function updateStatus(order, status) {
    if (status === "İptal") {
      setCancelOrder(order);
      setCancelReason(order.cancel_reason || "");
      return;
    }
    await updateOrder(order.id, { status });
  }

  async function saveCancelReason(event) {
    event.preventDefault();
    if (!cancelOrder || !cancelReason.trim()) return;
    setCancelSaving(true);
    try {
      await updateOrder(cancelOrder.id, { status: "İptal", cancelReason: cancelReason.trim() });
      setCancelOrder(null);
      setCancelReason("");
    } finally {
      setCancelSaving(false);
    }
  }

  async function saveTracking(order, trackingCode) {
    await updateOrder(order.id, { trackingCode });
  }

  return (
    <AdminPage title="Siparişler" subtitle={`${orders.length} sipariş listeleniyor.`}>
      <section className="admin-card table-card">
        <OrdersTable orders={orders} onStatusChange={updateStatus} onTrackingSave={saveTracking} />
      </section>
      {cancelOrder && (
        <Modal title="Siparişi iptal et" onClose={() => setCancelOrder(null)}>
          <form className="admin-form cancel-order-form" onSubmit={saveCancelReason}>
            <p><strong>{cancelOrder.order_no}</strong> numaralı sipariş için iptal sebebi girin. Bu sebep müşterinin hesabında da görünecek.</p>
            <label>İptal sebebi<textarea rows="4" value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} required /></label>
            <div className="modal-actions">
              <button type="button" className="admin-secondary" onClick={() => setCancelOrder(null)}>Vazgeç</button>
              <button className="admin-primary" disabled={cancelSaving || !cancelReason.trim()}>{cancelSaving ? "Kaydediliyor..." : "İptal et"}</button>
            </div>
          </form>
        </Modal>
      )}
    </AdminPage>
  );
}

function OrdersTable({ orders, compact = false, onStatusChange, onTrackingSave }) {
  const [expandedId, setExpandedId] = useState(null);
  const columnCount = compact ? 5 : 7;

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead><tr><th>Sipariş</th><th>Müşteri</th>{!compact && <th>Ürünler</th>}<th>Toplam</th><th>Durum</th><th>Tarih</th>{!compact && <th>Detay</th>}</tr></thead>
        <tbody>
          {orders.length ? orders.map((order) => (
            <Fragment key={order.id}>
              <tr className={expandedId === order.id ? "order-row expanded" : "order-row"}>
                <td><strong>{order.order_no}</strong></td>
                <td><span className="table-customer"><strong>{order.customer_name}</strong><small>{order.phone}</small><small>{order.email}</small></span></td>
                {!compact && <td>{order.items?.reduce((sum, item) => sum + item.quantity, 0)} ürün</td>}
                <td><strong>{formatPrice(order.total)}</strong></td>
                <td>
                  {onStatusChange ? (
                    <select className={`status-select status-${order.status.toLocaleLowerCase("tr-TR").replaceAll("ı", "i")}`} value={order.status} onChange={(event) => onStatusChange(order, event.target.value)}>
                      {["Ödeme Bekleniyor", "Yeni", "Hazırlanıyor", "Kargoda", "Tamamlandı", "İptal"].map((status) => <option key={status}>{status}</option>)}
                    </select>
                  ) : <StatusBadge value={order.status} />}
                </td>
                <td>{formatDate(order.created_at)}</td>
                {!compact && (
                  <td>
                    <button
                      className={expandedId === order.id ? "order-detail-toggle active" : "order-detail-toggle"}
                      onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                      aria-label="Sipariş detayını göster"
                    >
                      <ChevronDown size={17} />
                    </button>
                  </td>
                )}
              </tr>
              {!compact && expandedId === order.id && (
                <tr className="order-detail-row">
                  <td colSpan={columnCount}><AdminOrderDetail order={order} onTrackingSave={onTrackingSave} /></td>
                </tr>
              )}
            </Fragment>
          )) : <tr><td colSpan={columnCount} className="empty-table">Henüz sipariş yok.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function AdminOrderDetail({ order, onTrackingSave }) {
  const [trackingCode, setTrackingCode] = useState(order.tracking_code || "");
  const [trackingSaving, setTrackingSaving] = useState(false);
  const [trackingSaved, setTrackingSaved] = useState(false);
  const hasStructuredAddress = [
    order.neighborhood,
    order.street,
    order.building_no,
    order.floor,
    order.apartment_no
  ].some(Boolean);
  const fullAddress = hasStructuredAddress
    ? [
        ["İl / İlçe", [order.city, order.district].filter(Boolean).join(" / ")],
        ["Mahalle", order.neighborhood],
        ["Cadde / Sokak", order.street],
        ["Bina no", order.building_no],
        ["Kat", order.floor],
        ["Daire no", order.apartment_no],
        ["Posta kodu", order.postal_code]
      ].filter(([, value]) => value)
    : [
        ["Adres", order.address],
        ["İl / İlçe", [order.city, order.district].filter(Boolean).join(" / ")],
        ["Posta kodu", order.postal_code]
      ].filter(([, value]) => value);

  useEffect(() => {
    setTrackingCode(order.tracking_code || "");
    setTrackingSaved(false);
  }, [order.id, order.tracking_code]);

  async function saveTracking(event) {
    event.preventDefault();
    if (!onTrackingSave) return;
    setTrackingSaving(true);
    try {
      await onTrackingSave(order, trackingCode.trim());
      setTrackingSaved(true);
    } finally {
      setTrackingSaving(false);
    }
  }

  return (
    <div className="admin-order-detail">
      <div className="admin-order-information">
        <section>
          <h3>Müşteri bilgileri</h3>
          <p><strong>{order.customer_name}</strong></p>
          <p><Phone size={14} /> {order.phone}</p>
          <p><Mail size={14} /> {order.email}</p>
        </section>
        <section className="address-section">
          <h3>Teslimat adresi</h3>
          <div className="admin-address-grid">
            {fullAddress.map(([label, value]) => (
              <div key={label}><span>{label}</span><strong>{value}</strong></div>
            ))}
          </div>
        </section>
        <section>
          <h3>Sipariş bilgileri</h3>
          <p><span>Ödeme</span><strong>{order.payment_method}</strong></p>
          <p><span>Ara toplam</span><strong>{formatPrice(order.subtotal)}</strong></p>
          <p><span>Kargo</span><strong>{order.shipping ? formatPrice(order.shipping) : "Ücretsiz"}</strong></p>
          <p><span>Toplam</span><strong>{formatPrice(order.total)}</strong></p>
        </section>
        <section>
          <h3>Sipariş notu</h3>
          <p><StickyNote size={14} /> {order.notes || "Sipariş notu bulunmuyor."}</p>
        </section>
        <section>
          <h3>Kargo takibi</h3>
          <form className="tracking-form" onSubmit={saveTracking}>
            <input value={trackingCode} onChange={(event) => { setTrackingCode(event.target.value); setTrackingSaved(false); }} placeholder="Kargo takip kodu" />
            <button className="admin-primary" disabled={trackingSaving}>{trackingSaving ? "Kaydediliyor..." : "Kaydet"}</button>
          </form>
          <p><Package size={14} /> {trackingCode ? "Takip kodu müşteride görünecek." : "Henüz takip kodu girilmedi."}</p>
          {trackingSaved && <p className="tracking-saved"><Save size={14} /> Takip kodu kaydedildi.</p>}
        </section>
        {order.cancel_reason && (
          <section>
            <h3>İptal sebebi</h3>
            <p><CircleAlert size={14} /> {order.cancel_reason}</p>
          </section>
        )}
      </div>
      <div className="admin-order-products">
        <h3>Sipariş edilen ürünler</h3>
        {order.items?.map((item, index) => (
          <article key={`${item.productId}-${index}`}>
            <img src={item.image || "/images/hero-scarf.webp"} alt={item.name} />
            <div>
              <strong>{item.name}</strong>
              <span>{[item.color && `Renk: ${item.color}`, item.size && `Beden: ${item.size}`].filter(Boolean).join(" · ") || "Standart ürün"}</span>
              <small>{item.quantity} adet × {formatPrice(item.price)}</small>
            </div>
            <b>{formatPrice(item.lineTotal || item.price * item.quantity)}</b>
          </article>
        ))}
      </div>
    </div>
  );
}

export function AdminSettings() {
  const { refreshStore } = useStore();
  const [form, setForm] = useState(null);
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [saved, setSaved] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { api("/api/admin/settings").then(setForm); }, []);
  if (!form) return <AdminPageLoading />;

  function update(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  function updateAnnouncement(index, value) {
    const current = form.announcements || [form.announcement || ""];
    setForm({
      ...form,
      announcements: current.map((item, itemIndex) => itemIndex === index ? value : item)
    });
  }

  function addAnnouncement() {
    setForm({ ...form, announcements: [...(form.announcements || []), ""] });
  }

  function removeAnnouncement(index) {
    const announcements = (form.announcements || [form.announcement || ""]).filter((_, itemIndex) => itemIndex !== index);
    setForm({ ...form, announcements: announcements.length ? announcements : [""] });
  }

  async function upload(event, field) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    try {
      const body = await imageFormData(file);
      const result = await api("/api/admin/upload", { method: "POST", body });
      if (field === "heroImages") {
        setForm({ ...form, heroImages: [...(form.heroImages || []), result.url] });
      } else {
        setForm({ ...form, [field]: result.url });
      }
    } catch (uploadError) {
      setError(uploadError.message);
    }
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      await api("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify({
          ...form,
          shippingFee: Number(form.shippingFee),
          freeShippingThreshold: Number(form.freeShippingThreshold),
          returnDays: Number(form.returnDays)
        })
      });
      await refreshStore();
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function changePassword() {
    setError("");
    if (passwords.newPassword !== passwords.confirmPassword) {
      setError("Yeni şifreler eşleşmiyor.");
      return;
    }
    try {
      await api("/api/admin/password", {
        method: "PUT",
        body: JSON.stringify({
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword
        })
      });
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordSaved(true);
      setTimeout(() => setPasswordSaved(false), 1800);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <AdminPage title="Site Ayarları" subtitle="Vitrin metinleri, görseller ve operasyon bilgileri.">
      <form className="settings-form" onSubmit={submit}>
        {error && <div className="form-error">{error}</div>}
        <SettingsSection title="Marka ve duyuru" description="Üst bölümde görünen temel marka bilgileri.">
          <div className="form-grid">
            <label>Mağaza adı<input name="storeName" value={form.storeName || ""} onChange={update} /></label>
            <label className="wide">Alt bilgi kısa metni<input name="footerNote" value={form.footerNote || ""} onChange={update} /></label>
          </div>
          <div className="announcement-editor">
            <div className="image-manager-head"><div><strong>Duyuru mesajları</strong><small>Mesajlar 5 saniyede bir animasyonla değişir.</small></div><button type="button" className="admin-secondary" onClick={addAnnouncement}><Plus size={16} /> Mesaj ekle</button></div>
            {(form.announcements || [form.announcement || ""]).map((message, index) => (
              <div className="announcement-row" key={index}>
                <span>{index + 1}</span>
                <input value={message} onChange={(event) => updateAnnouncement(index, event.target.value)} placeholder="Duyuru metni" />
                <button type="button" onClick={() => removeAnnouncement(index)} aria-label="Duyuruyu sil"><Trash2 size={17} /></button>
              </div>
            ))}
          </div>
          <div className="setting-upload"><img src={form.logo} alt="" /><label className="upload-button"><ImagePlus size={17} /> Logoyu değiştir<input type="file" accept="image/*" onChange={(event) => upload(event, "logo")} /></label></div>
        </SettingsSection>

        <SettingsSection title="Ana sayfa vitrini" description="Büyük açılış alanının metinleri ve slayt görselleri.">
          <div className="form-grid">
            <label className="wide">Başlık<input name="heroTitle" value={form.heroTitle || ""} onChange={update} /></label>
            <label className="wide">Alt metin<textarea name="heroSubtitle" value={form.heroSubtitle || ""} onChange={update} rows="2" /></label>
            <label>Buton metni<input name="heroButton" value={form.heroButton || ""} onChange={update} /></label>
          </div>
          <div className="image-manager">
            <div className="image-manager-head"><strong>Slayt görselleri</strong><label className="upload-button"><ImagePlus size={17} /> Yeni slayt<input type="file" accept="image/*" onChange={(event) => upload(event, "heroImages")} /></label></div>
            <div className="hero-admin-images">
              {(form.heroImages || []).map((image, index) => <div key={`${image}-${index}`}><img src={image} alt="" /><button type="button" onClick={() => setForm({ ...form, heroImages: form.heroImages.filter((_, itemIndex) => itemIndex !== index) })}><X size={15} /></button></div>)}
            </div>
          </div>
        </SettingsSection>

        <SettingsSection title="Giriş ve kayıt ekranı" description="Müşteri giriş/kayıt sayfasındaki fotoğraf ve metinleri düzenleyin.">
          <div className="form-grid">
            <label>Küçük başlık<input name="authEyebrow" value={form.authEyebrow || ""} onChange={update} /></label>
            <label>Giriş başlığı<input name="authLoginTitle" value={form.authLoginTitle || ""} onChange={update} /></label>
            <label className="wide">Giriş açıklaması<textarea name="authLoginText" value={form.authLoginText || ""} onChange={update} rows="2" /></label>
            <label>Kayıt başlığı<input name="authRegisterTitle" value={form.authRegisterTitle || ""} onChange={update} /></label>
            <label className="wide">Kayıt açıklaması<textarea name="authRegisterText" value={form.authRegisterText || ""} onChange={update} rows="2" /></label>
          </div>
          <div className="setting-upload wide-upload">
            <img src={form.authImage || "/images/hero-vest.webp"} alt="" />
            <label className="upload-button"><ImagePlus size={17} /> Giriş fotoğrafını değiştir<input type="file" accept="image/*" onChange={(event) => upload(event, "authImage")} /></label>
          </div>
        </SettingsSection>

        <SettingsSection title="WhatsApp ve iletişim" description="WhatsApp butonu ve mağaza bilgilerinde gösterilir.">
          <div className="form-grid">
            <label>Telefon<input name="phone" value={form.phone || ""} onChange={update} /></label>
            <label>E-posta<input name="email" value={form.email || ""} onChange={update} /></label>
            <label>WhatsApp numarası<input name="whatsapp" value={form.whatsapp || ""} onChange={update} /></label>
            <label>Instagram adresi<input name="instagram" value={form.instagram || ""} onChange={update} /></label>
            <label className="wide">Adres<input name="address" value={form.address || ""} onChange={update} /></label>
          </div>
        </SettingsSection>

        <SettingsSection title="Güven şeridi" description="Ana sayfadaki Güvenli alışveriş, Hızlı gönderim ve Kolay iade kutularını düzenleyin.">
          <div className="form-grid">
            <label>1. başlık<input name="trustTitle1" value={form.trustTitle1 || ""} onChange={update} /></label>
            <label>1. alt metin<input name="trustText1" value={form.trustText1 || ""} onChange={update} /></label>
            <label>2. başlık<input name="trustTitle2" value={form.trustTitle2 || ""} onChange={update} /></label>
            <label>2. alt metin<input name="trustText2" value={form.trustText2 || ""} onChange={update} /></label>
            <label>3. başlık<input name="trustTitle3" value={form.trustTitle3 || ""} onChange={update} /></label>
            <label>3. alt metin<input name="trustText3" value={form.trustText3 || ""} onChange={update} /></label>
          </div>
        </SettingsSection>

        <SettingsSection title="Kargo ve iade" description="Sepette otomatik hesaplamada kullanılır.">
          <div className="form-grid">
            <label>Kargo ücreti<input type="number" step="0.01" name="shippingFee" value={form.shippingFee ?? ""} onChange={update} /></label>
            <label>Ücretsiz kargo limiti<input type="number" step="0.01" name="freeShippingThreshold" value={form.freeShippingThreshold ?? ""} onChange={update} /></label>
            <label>İade süresi (iş günü)<input type="number" name="returnDays" value={form.returnDays ?? ""} onChange={update} /></label>
          </div>
        </SettingsSection>

        <SettingsSection title="Yönetici şifresi" description="Panel hesabınızın giriş şifresini güncelleyin.">
          <div className="form-grid">
            <label className="wide">Mevcut şifre<input type="password" value={passwords.currentPassword} onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })} /></label>
            <label>Yeni şifre<input type="password" value={passwords.newPassword} onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })} /></label>
            <label>Yeni şifre tekrar<input type="password" value={passwords.confirmPassword} onChange={(event) => setPasswords({ ...passwords, confirmPassword: event.target.value })} /></label>
          </div>
          <button type="button" className="admin-secondary password-button" onClick={changePassword}>
            {passwordSaved ? "Şifre güncellendi" : "Şifreyi güncelle"}
          </button>
        </SettingsSection>

        <div className="settings-save"><button className="admin-primary"><Save size={18} /> {saved ? "Kaydedildi" : "Tüm değişiklikleri kaydet"}</button></div>
      </form>
    </AdminPage>
  );
}

function SettingsSection({ title, description, children }) {
  return <section className="admin-card settings-section"><div className="settings-section-head"><h2>{title}</h2><p>{description}</p></div><div>{children}</div></section>;
}

function AdminPage({ title, subtitle, action, children }) {
  return (
    <main className="admin-page">
      <div className="admin-page-head"><div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>
      {children}
    </main>
  );
}

function AdminPageLoading() {
  return <div className="admin-page"><div className="admin-skeleton" /><div className="admin-skeleton tall" /></div>;
}

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="admin-modal">
        <div className="modal-head"><h2>{title}</h2><button className="icon-button" onClick={onClose}><X /></button></div>
        {children}
      </div>
    </div>
  );
}

function StatusBadge({ value }) {
  const className = value.toLocaleLowerCase("tr-TR").replaceAll("ı", "i").replaceAll(" ", "-");
  return <span className={`status-badge status-${className}`}>{value}</span>;
}
