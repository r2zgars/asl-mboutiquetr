import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Heart,
  Home,
  Instagram,
  LayoutGrid,
  LockKeyhole,
  LogOut,
  MapPin,
  MessageCircle,
  Menu,
  Minus,
  PackageCheck,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  Truck,
  UserRound,
  X
} from "lucide-react";
import { Link, Outlet, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getCities, getDistrictsByCityCode } from "turkey-neighbourhoods";
import { api, formatDate, formatPrice, getVariantImages } from "./api";
import { useStore } from "./store";

function scrollPageTop() {
  window.requestAnimationFrame(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  });
}

export function StoreLayout() {
  const { settings, categories, products } = useStore();
  const location = useLocation();

  useEffect(() => {
    scrollPageTop();
  }, [location.pathname]);

  useEffect(() => {
    const elements = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("is-visible")),
      { threshold: 0.12 }
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [location.pathname, categories.length, products.length]);

  return (
    <div
      className="store-shell"
      style={{ "--ink": settings.primaryColor || "#0b0b0b", "--warm": settings.accentColor || "#a4743b" }}
    >
      <Header />
      <main key={location.pathname} className="page-transition">
        <Outlet />
      </main>
      <Footer />
      <MobileAppNav />
    </div>
  );
}

function whatsappUrl(settings, message = "Merhaba, mağazanız hakkında bilgi almak istiyorum.") {
  const number = String(settings.whatsapp || "").replace(/\D/g, "");
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

function AnnouncementBar({ settings }) {
  const configured = Array.isArray(settings.announcements) ? settings.announcements.filter(Boolean) : [];
  const messages = configured.length ? configured : [settings.announcement || "AÇILIŞA ÖZEL İNDİRİM"];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
    if (messages.length < 2) return undefined;
    const timer = setInterval(() => setIndex((current) => (current + 1) % messages.length), 5000);
    return () => clearInterval(timer);
  }, [messages.join("|")]);

  return <div className="announcement"><span key={`${index}-${messages[index]}`}>{messages[index]}</span></div>;
}

function MobileAppNav() {
  const { cartCount, customer } = useStore();
  const location = useLocation();
  const links = [
    { to: "/", label: "Ana Sayfa", icon: Home },
    { to: "/kategori/new-drop", label: "New Drop", icon: LayoutGrid },
    { to: "/sepet", label: "Sepetim", icon: ShoppingBag, badge: cartCount },
    { to: customer ? "/hesabim" : "/giris", label: "Hesabım", icon: UserRound }
  ];

  return (
    <nav className="mobile-app-nav" aria-label="Mobil hızlı menü">
      {links.map(({ to, label, icon: Icon, badge }) => {
        const active = to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);
        return (
          <Link key={label} to={to} className={active ? "active" : ""} onClick={scrollPageTop}>
            <span className="mobile-nav-icon">
              <Icon size={21} strokeWidth={active ? 2.2 : 1.7} />
              {badge > 0 && <b>{badge}</b>}
            </span>
            <small>{label}</small>
          </Link>
        );
      })}
    </nav>
  );
}

function Header() {
  const { settings, categories, cart, cartCount, subtotal, customer, adminAuthenticated } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  function submitSearch(event) {
    event.preventDefault();
    if (!query.trim()) return;
    setSearchOpen(false);
    navigate(`/arama?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <>
      <AnnouncementBar settings={settings} />
      <header className="site-header">
        <button className="icon-button mobile-only" onClick={() => setMenuOpen(true)} aria-label="Menüyü aç">
          <Menu size={23} />
        </button>
        <Link className="brand" to="/" aria-label="Aslım Boutique anasayfa" onClick={scrollPageTop}>
          {settings.logo ? <img src={settings.logo} alt={settings.storeName || "Aslım Boutique"} /> : settings.storeName}
        </Link>
        <nav className="desktop-nav">
          {categories.map((category) => (
            <Link key={category.id} to={`/kategori/${category.slug}`} onClick={scrollPageTop}>
              {category.name}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <button className="icon-button" onClick={() => setSearchOpen(true)} aria-label="Ara">
            <Search size={23} />
          </button>
          <Link className="icon-button desktop-only" to={customer ? "/hesabim" : "/giris"} aria-label={customer ? "Hesabım" : "Giriş yap"} onClick={scrollPageTop}>
            <UserRound size={23} />
          </Link>
          <div className="cart-hover-wrap">
            <Link className="icon-button cart-button" to="/sepet" aria-label="Sepet" onClick={scrollPageTop}>
              <ShoppingBag size={23} />
              {cartCount > 0 && <span>{cartCount}</span>}
            </Link>
            <div className="cart-preview">
              <div className="cart-preview-head">
                <strong>Sepetim</strong>
                <span>{cartCount} ürün</span>
              </div>
              {cart.length ? (
                <>
                  <div className="cart-preview-items">
                    {cart.slice(0, 4).map((item) => (
                      <Link to={`/urun/${item.slug}`} key={item.key}>
                        <img src={item.image || "/images/hero-scarf.webp"} alt={item.name} />
                        <span>
                          <strong>{item.name}</strong>
                          <small>{[item.color, item.size, `${item.quantity} adet`].filter(Boolean).join(" · ")}</small>
                        </span>
                        <b>{formatPrice(item.price * item.quantity)}</b>
                      </Link>
                    ))}
                  </div>
                  <div className="cart-preview-total"><span>Ara toplam</span><strong>{formatPrice(subtotal)}</strong></div>
                  <Link className="button dark full" to="/sepet">SEPETE GİT</Link>
                </>
              ) : (
                <div className="cart-preview-empty">Sepetiniz henüz boş.</div>
              )}
            </div>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="mobile-menu">
          <div className="mobile-menu-head">
            <img src={settings.logo || "/images/logo.webp"} alt="" />
            <button className="icon-button" onClick={() => setMenuOpen(false)}><X /></button>
          </div>
          <nav>
            <Link to="/" onClick={() => { setMenuOpen(false); scrollPageTop(); }}>ANASAYFA</Link>
            {categories.map((category) => (
              <Link key={category.id} to={`/kategori/${category.slug}`} onClick={() => { setMenuOpen(false); scrollPageTop(); }}>
                {category.name}
              </Link>
            ))}
            {customer ? (
              <Link to="/hesabim" onClick={() => { setMenuOpen(false); scrollPageTop(); }}>HESABIM</Link>
            ) : (
              <>
                <Link to="/giris" onClick={() => { setMenuOpen(false); scrollPageTop(); }}>GİRİŞ YAP</Link>
                <Link to="/kayit-ol" onClick={() => { setMenuOpen(false); scrollPageTop(); }}>KAYIT OL</Link>
              </>
            )}
            {adminAuthenticated && <Link to="/admin" onClick={() => { setMenuOpen(false); scrollPageTop(); }}>YÖNETİM PANELİ</Link>}
          </nav>
        </div>
      )}

      {searchOpen && (
        <div className="search-overlay">
          <button className="icon-button search-close" onClick={() => setSearchOpen(false)}><X /></button>
          <form onSubmit={submitSearch}>
            <span>Ne aramıştınız?</span>
            <div>
              <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ürün ara..." />
              <button type="submit"><ArrowRight /></button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function Footer() {
  const { settings, categories, customer, adminAuthenticated } = useStore();
  return (
    <footer className="site-footer">
      <section className="footer-grid">
        <div className="footer-brand">
          <div className="footer-socials">
            <a href={settings.instagram || "#"} target="_blank" rel="noreferrer"><Instagram size={21} /> Instagram</a>
            <a href={whatsappUrl(settings)} target="_blank" rel="noreferrer"><MessageCircle size={21} /> WhatsApp</a>
          </div>
        </div>
        <div>
          <h3>Kategoriler</h3>
          {categories.filter((category) => category.slug === "new-drop").map((category) => (
            <Link key={category.id} to={`/kategori/${category.slug}`}>{category.name}</Link>
          ))}
        </div>
        <div>
          <h3>Yardım</h3>
          <a href={whatsappUrl(settings)} target="_blank" rel="noreferrer">İletişim</a>
          <Link to="/sss">Sıkça Sorulan Sorular</Link>
          <Link to="/sepet">Sepetim</Link>
          {customer ? (
            <Link to="/hesabim">Hesabım</Link>
          ) : (
            <>
              <Link to="/giris">Giriş Yap</Link>
              <Link to="/kayit-ol">Kayıt Ol</Link>
            </>
          )}
          {adminAuthenticated && <Link to="/admin">Yönetim Paneli</Link>}
        </div>
        <div>
          <h3>İletişim</h3>
          <a className="footer-whatsapp" href={whatsappUrl(settings)} target="_blank" rel="noreferrer">
            <MessageCircle size={18} /> WhatsApp'tan yazın
          </a>
          <p>{settings.phone}</p>
          <p>{settings.email}</p>
          <p>{settings.address}</p>
        </div>
      </section>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Aslım Boutique. Tüm hakları saklıdır.</span>
        <span>Güvenli alışveriş · SSL koruması</span>
      </div>
    </footer>
  );
}

export function HomePage() {
  const { settings, products, loading } = useStore();
  const [slide, setSlide] = useState(0);
  const slides = settings.heroImages?.length ? settings.heroImages : ["/images/hero-scarf.webp"];

  useEffect(() => {
    const timer = setInterval(() => setSlide((current) => (current + 1) % slides.length), 5500);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (loading) return <Loading />;

  const featured = products.filter((product) => product.featured).slice(0, 4);
  return (
    <>
      <section className="hero">
        {slides.map((image, index) => (
          <div
            key={image}
            className={`hero-slide ${slide === index ? "active" : ""}`}
            style={{ backgroundImage: `url("${image}")` }}
          />
        ))}
        <div className="hero-shade" />
        <div className="hero-copy reveal">
          <p className="eyebrow">YENİ SEZON · 2026</p>
          <h1>{settings.heroTitle}</h1>
          <p>{settings.heroSubtitle}</p>
          <Link className="button light" to="/kategori/new-drop">{settings.heroButton || "KEŞFET"}</Link>
        </div>
        <button className="hero-arrow left" onClick={() => setSlide((slide - 1 + slides.length) % slides.length)}>
          <ArrowLeft />
        </button>
        <button className="hero-arrow right" onClick={() => setSlide((slide + 1) % slides.length)}>
          <ArrowRight />
        </button>
        <div className="hero-dots">
          {slides.map((_, index) => <button key={index} className={slide === index ? "active" : ""} onClick={() => setSlide(index)} />)}
        </div>
      </section>

      <TrustStrip settings={settings} />

      <section className="section">
        <SectionHeading eyebrow="ÖZENLE SEÇİLDİ" title="Yeni gelenler" link="/kategori/new-drop" />
        <div className="product-grid">
          {featured.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      </section>

    </>
  );
}

function TrustStrip({ settings }) {
  return (
    <section className="trust-strip reveal">
      <div><ShieldCheck /><span><strong>Güvenli alışveriş</strong><small>256 Bit SSL koruması</small></span></div>
      <div><Truck /><span><strong>Hızlı gönderim</strong><small>Özenli ve takipli teslimat</small></span></div>
      <div><PackageCheck /><span><strong>Kolay iade</strong><small>{settings.returnDays || 15} iş günü içinde</small></span></div>
    </section>
  );
}

function SectionHeading({ eyebrow, title, link }) {
  return (
    <div className="section-heading reveal">
      <div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div>
      {link && <Link className="text-link" to={link}>TÜMÜNÜ GÖR <ArrowRight size={18} /></Link>}
    </div>
  );
}

function FavoriteButton({ productId, className = "" }) {
  const { customer, favoriteIds, toggleFavorite } = useStore();
  const navigate = useNavigate();
  const favorite = favoriteIds.includes(Number(productId));

  async function toggle(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!customer) {
      navigate("/giris");
      return;
    }
    await toggleFavorite(productId);
  }

  return (
    <button
      type="button"
      className={`favorite-button ${favorite ? "active" : ""} ${className}`}
      onClick={toggle}
      aria-label={favorite ? "Beğenilenlerden çıkar" : "Beğenilenlere ekle"}
      title={favorite ? "Beğenilenlerden çıkar" : "Beğenilenlere ekle"}
    >
      <Heart size={20} fill={favorite ? "currentColor" : "none"} />
    </button>
  );
}

export function ProductCard({ product }) {
  const { addToCart } = useStore();
  const [added, setAdded] = useState(false);
  const addedTimer = useRef(null);
  const soldOut = product.stock <= 0;

  useEffect(() => () => window.clearTimeout(addedTimer.current), []);

  function quickAdd(event) {
    event.preventDefault();
    event.stopPropagation();
    if (soldOut) return;

    addToCart(product, { size: product.sizes?.[0], color: product.colors?.[0] });
    setAdded(true);
    window.clearTimeout(addedTimer.current);
    addedTimer.current = window.setTimeout(() => setAdded(false), 1500);
  }

  return (
    <article className="product-card reveal">
      <Link to={`/urun/${product.slug}`} className="product-image">
        <img src={product.images?.[0] || "/images/hero-scarf.webp"} alt={product.name} />
        {product.compare_price > product.price && (
          <span className="discount">-%{Math.round((1 - product.price / product.compare_price) * 100)}</span>
        )}
        {soldOut && <span className="sold-out">STOKTA YOK</span>}
      </Link>
      <FavoriteButton productId={product.id} className="product-card-favorite" />
      <div className="product-card-body">
        <Link to={`/urun/${product.slug}`}>
          <p className="product-category">{product.category_name}</p>
          <h3>{product.name}</h3>
        </Link>
        <div className="price-row">
          <strong>{formatPrice(product.price)}</strong>
          {product.compare_price > product.price && <del>{formatPrice(product.compare_price)}</del>}
        </div>
        <button
          type="button"
          className={`quick-add ${added ? "added" : ""}`}
          disabled={soldOut}
          onClick={quickAdd}
          aria-live="polite"
        >
          {soldOut ? "STOKTA YOK" : added ? <><Check size={14} /> EKLENDİ</> : "SEPETE EKLE"}
        </button>
      </div>
    </article>
  );
}

export function CategoryPage() {
  const { slug } = useParams();
  const { categories, products, loading } = useStore();
  const [sort, setSort] = useState(slug === "new-drop" ? "newest" : "featured");
  const category = categories.find((item) => item.slug === slug);

  useEffect(() => {
    setSort(slug === "new-drop" ? "newest" : "featured");
  }, [slug]);

  const list = useMemo(() => {
    const items = products.filter((product) =>
      slug === "new-drop" ? true : product.category_slug === slug
    );
    if (sort === "priceAsc") return [...items].sort((a, b) => a.price - b.price);
    if (sort === "priceDesc") return [...items].sort((a, b) => b.price - a.price);
    if (sort === "newest") {
      return [...items].sort((a, b) => {
        const dateDifference = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        return dateDifference || Number(b.id) - Number(a.id);
      });
    }
    return items;
  }, [products, slug, sort]);

  if (loading) return <Loading />;
  return (
    <div className="listing-page">
      <div className="listing-hero" style={{ backgroundImage: `url("${category?.image || "/images/hero-scarf.webp"}")` }}>
        <div><p>ASLIM BOUTIQUE</p><h1>{category?.name || "Koleksiyon"}</h1><span>{category?.description}</span></div>
      </div>
      <div className="listing-toolbar">
        <span>{list.length} ürün</span>
        <label>Sırala <ChevronDown size={16} />
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="newest">En Yeni</option>
            <option value="featured">Önerilen</option>
            <option value="priceAsc">Fiyat: Artan</option>
            <option value="priceDesc">Fiyat: Azalan</option>
          </select>
        </label>
      </div>
      {list.length ? (
        <div className="product-grid listing-grid">{list.map((product) => <ProductCard key={product.id} product={product} />)}</div>
      ) : (
        <div className="empty-state"><ShoppingBag /><h2>Bu kategoride henüz ürün yok.</h2><Link to="/">Anasayfaya dön</Link></div>
      )}
    </div>
  );
}

export function SearchPage() {
  const [params] = useSearchParams();
  const query = params.get("q") || "";
  const { products, loading } = useStore();
  const list = products.filter((product) =>
    `${product.name} ${product.description} ${product.category_name}`.toLocaleLowerCase("tr-TR")
      .includes(query.toLocaleLowerCase("tr-TR"))
  );
  if (loading) return <Loading />;
  return (
    <div className="simple-page">
      <SectionHeading eyebrow={`${list.length} SONUÇ`} title={`“${query}” için arama sonuçları`} />
      <div className="product-grid">{list.map((product) => <ProductCard key={product.id} product={product} />)}</div>
    </div>
  );
}

export function ProductPage() {
  const { slug } = useParams();
  const { products, loading, addToCart } = useStore();
  const product = products.find((item) => item.slug === slug);
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const galleryImages = getVariantImages(product, color, size);

  useEffect(() => {
    if (product) {
      setSize(product.sizes?.[0] || "");
      setColor(product.colors?.[0] || "");
      setQuantity(1);
    }
  }, [product]);

  if (loading) return <Loading />;
  if (!product) return <NotFound />;

  function add() {
    addToCart(product, { size, color, quantity });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  return (
    <div className="product-page reveal">
      <div className="product-gallery variant-gallery" key={`${color}-${size}`}>
        {(galleryImages.length ? galleryImages : ["/images/hero-scarf.webp"]).map((image) => (
          <img key={image} src={image} alt={product.name} />
        ))}
      </div>
      <div className="product-info">
        <p className="product-category">{product.category_name}</p>
        <div className="product-title-row">
          <h1>{product.name}</h1>
          <FavoriteButton productId={product.id} />
        </div>
        <div className="product-price">
          <strong>{formatPrice(product.price)}</strong>
          {product.compare_price > product.price && <del>{formatPrice(product.compare_price)}</del>}
        </div>
        <p className="installment">Peşin fiyatına 3 taksit imkânı</p>
        {product.colors?.length > 0 && (
          <div className="option-group">
            <div><strong>Renk</strong><span>{color}</span></div>
            <div className="choice-row">
              {product.colors.map((item) => <button className={color === item ? "selected" : ""} onClick={() => setColor(item)} key={item}>{item}</button>)}
            </div>
          </div>
        )}
        {product.sizes?.length > 0 && (
          <div className="option-group">
            <div><strong>Beden</strong><button className="size-guide">Beden rehberi</button></div>
            <div className="choice-row">
              {product.sizes.map((item) => <button className={size === item ? "selected" : ""} onClick={() => setSize(item)} key={item}>{item}</button>)}
            </div>
          </div>
        )}
        <div className="purchase-row">
          <div className="quantity">
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={16} /></button>
            <span>{quantity}</span>
            <button onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}><Plus size={16} /></button>
          </div>
          <button className="button dark add-button" onClick={add} disabled={product.stock <= 0}>
            {added ? <><Check size={19} /> EKLENDİ</> : product.stock > 0 ? "SEPETE EKLE" : "STOKTA YOK"}
          </button>
        </div>
        <div className="stock-note">{product.stock > 0 ? `Stokta ${product.stock} adet` : "Stokta yok"}</div>
        <div className="product-description">
          <h2>Ürün açıklaması</h2>
          <p>{product.description}</p>
          <p className="sku">Ürün kodu: {product.sku}</p>
        </div>
        <div className="product-benefits">
          <div><Truck /><span><strong>Hızlı gönderim</strong>1-3 iş günü içinde kargoda</span></div>
          <div><LockKeyhole /><span><strong>Güvenli ödeme</strong>Bilgileriniz koruma altında</span></div>
        </div>
      </div>
    </div>
  );
}

export function CartPage() {
  const { cart, subtotal, shipping, total, updateQuantity, removeFromCart, settings } = useStore();
  if (!cart.length) {
    return <div className="empty-state cart-empty"><ShoppingBag /><h1>Sepetiniz boş.</h1><p>Yeni koleksiyonu keşfetmeye ne dersiniz?</p><Link className="button dark" to="/">ALIŞVERİŞE BAŞLA</Link></div>;
  }
  const remaining = Math.max(0, Number(settings.freeShippingThreshold || 0) - subtotal);
  return (
    <div className="cart-page">
      <h1>Sepetim <span>({cart.length})</span></h1>
      <div className="cart-layout">
        <section className="cart-items">
          {remaining > 0 ? (
            <div className="shipping-progress">
              Ücretsiz kargo için <strong>{formatPrice(remaining)}</strong> daha ekleyin.
              <div><span style={{ width: `${Math.min(100, (subtotal / settings.freeShippingThreshold) * 100)}%` }} /></div>
            </div>
          ) : <div className="shipping-progress success"><Check size={18} /> Ücretsiz kargo kazandınız.</div>}
          {cart.map((item) => (
            <article className="cart-item" key={item.key}>
              <Link to={`/urun/${item.slug}`}><img src={item.image} alt={item.name} /></Link>
              <div className="cart-item-info">
                <Link to={`/urun/${item.slug}`}><h2>{item.name}</h2></Link>
                <p>{[item.color, item.size].filter(Boolean).join(" · ")}</p>
                <strong>{formatPrice(item.price)}</strong>
                <div className="quantity small">
                  <button onClick={() => updateQuantity(item.key, item.quantity - 1)}><Minus size={14} /></button>
                  <span>{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.key, item.quantity + 1)}><Plus size={14} /></button>
                </div>
              </div>
              <button className="remove-item" onClick={() => removeFromCart(item.key)}><X size={18} /></button>
            </article>
          ))}
        </section>
        <OrderSummary subtotal={subtotal} shipping={shipping} total={total}>
          <Link className="button dark full" to="/odeme">SİPARİŞİ TAMAMLA</Link>
        </OrderSummary>
      </div>
    </div>
  );
}

function OrderSummary({ subtotal, shipping, total, children }) {
  return (
    <aside className="order-summary">
      <h2>Sipariş özeti</h2>
      <div><span>Ara toplam</span><strong>{formatPrice(subtotal)}</strong></div>
      <div><span>Kargo</span><strong>{shipping ? formatPrice(shipping) : "Ücretsiz"}</strong></div>
      <div className="summary-total"><span>Toplam</span><strong>{formatPrice(total)}</strong></div>
      {children}
      <p><LockKeyhole size={15} /> Güvenli ödeme altyapısı</p>
    </aside>
  );
}

export function CheckoutPage() {
  const { cart, subtotal, shipping, total, clearCart, customer, authLoading } = useStore();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [paytrConfig, setPaytrConfig] = useState({ enabled: false, testMode: true });
  const [form, setForm] = useState({
    customerName: "", email: "", phone: "", address: "", city: "", district: "",
    neighborhood: "", street: "", buildingNo: "", floor: "", apartmentNo: "",
    postalCode: "", notes: "", paymentMethod: "PayTR"
  });
  const cities = useMemo(() => getCities(), []);
  const selectedCity = cities.find((city) => city.name === form.city);
  const districts = selectedCity ? getDistrictsByCityCode(selectedCity.code) : [];

  useEffect(() => {
    api("/api/paytr/config").then(setPaytrConfig).catch(() => setPaytrConfig({ enabled: false, testMode: true }));
  }, []);

  useEffect(() => {
    if (!customer) return;
    setForm((current) => ({
      ...current,
      customerName: current.customerName || customer.name,
      email: current.email || customer.email,
      phone: current.phone || customer.phone || ""
    }));
  }, [customer]);

  if (!cart.length) return <div className="empty-state"><h1>Sepetiniz boş.</h1><Link to="/">Alışverişe dön</Link></div>;
  if (authLoading) return <Loading />;
  if (!customer) {
    return (
      <div className="checkout-account-gate">
        <UserRound size={38} strokeWidth={1.4} />
        <h1>Sipariş için hesabınıza giriş yapın.</h1>
        <p>Sipariş güvenliği ve takibi için kayıtlı bir müşteri hesabı gereklidir.</p>
        <div>
          <Link className="button dark" to="/giris">GİRİŞ YAP</Link>
          <Link className="button" to="/kayit-ol">KAYIT OL</Link>
        </div>
      </div>
    );
  }
  if (!customer.email_verified) {
    return (
      <div className="checkout-account-gate">
        <ShieldCheck size={38} strokeWidth={1.4} />
        <h1>E-posta adresinizi doğrulayın.</h1>
        <p>Siparişi tamamlamadan önce {customer.email} adresine gönderilen kodu girmeniz gerekiyor.</p>
        <Link className="button dark" to="/hesabim?bolum=profile">ŞİMDİ DOĞRULA</Link>
      </div>
    );
  }

  function update(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const result = await api("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          items: cart.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            size: item.size,
            color: item.color
          }))
        })
      });
      clearCart();
      if (result.paytr?.iframeUrl) {
        navigate(`/paytr-odeme/${result.orderNo}`, { state: { orderNo: result.orderNo, paytr: result.paytr } });
        return;
      }
      navigate("/siparis-basarili", { state: result });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="checkout-page">
      <form className="checkout-form" onSubmit={submit}>
        <p className="eyebrow">GÜVENLİ ÖDEME</p>
        <h1>Teslimat bilgileri</h1>
        {error && <div className="form-error">{error}</div>}
        <div className="form-grid">
          <label className="wide">Ad soyad<input name="customerName" value={form.customerName} onChange={update} required /></label>
          <label>E-posta<input type="email" name="email" value={form.email} readOnly /></label>
          <label>Telefon<input name="phone" value={form.phone} onChange={update} required /></label>
          <label>İl
            <select
              name="city"
              value={form.city}
              onChange={(event) => setForm({ ...form, city: event.target.value, district: "" })}
              required
            >
              <option value="">İl seçin</option>
              {cities.map((city) => <option key={city.code} value={city.name}>{city.name}</option>)}
            </select>
          </label>
          <label>İlçe
            <select name="district" value={form.district} onChange={update} required disabled={!form.city}>
              <option value="">İlçe seçin</option>
              {districts.map((district) => <option key={district} value={district}>{district}</option>)}
            </select>
          </label>
          <label>Mahalle<input name="neighborhood" value={form.neighborhood} onChange={update} required /></label>
          <label>Cadde / Sokak<input name="street" value={form.street} onChange={update} required /></label>
          <label>Bina no<input name="buildingNo" value={form.buildingNo} onChange={update} required /></label>
          <label>Kat<input name="floor" value={form.floor} onChange={update} required /></label>
          <label>Daire no<input name="apartmentNo" value={form.apartmentNo} onChange={update} required /></label>
          <label>Posta kodu<input name="postalCode" value={form.postalCode} onChange={update} /></label>
          <label className="wide">Adres tarifi<textarea name="address" value={form.address} onChange={update} rows="2" placeholder="Site adı, blok, kapı bilgisi veya tarif" /></label>
          <label className="wide">Sipariş notu<textarea name="notes" value={form.notes} onChange={update} rows="2" /></label>
        </div>
        <h2>Ödeme yöntemi</h2>
        <label className="payment-choice">
          <input type="radio" name="paymentMethod" value="PayTR" checked readOnly />
          <span><strong>Kart ile Ödeme</strong><small>PayTR güvenli ödeme ekranında kartınızla ödeyin.</small></span>
        </label>
        {!paytrConfig.enabled && (
          <div className="form-error payment-unavailable">
            Ödeme altyapısı hazırlanıyor. PayTR bilgileri tanımlanınca sipariş almaya hazır olacak.
          </div>
        )}
        <button className="button dark full" disabled={submitting || !paytrConfig.enabled}>{submitting ? "ÖDEME EKRANI AÇILIYOR..." : `${formatPrice(total)} · ÖDEMEYE GEÇ`}</button>
      </form>
      <OrderSummary subtotal={subtotal} shipping={shipping} total={total}>
        <div className="checkout-mini-items">
          {cart.map((item) => <div key={item.key}><img src={item.image} alt="" /><span>{item.name}<small>{item.quantity} adet</small></span><strong>{formatPrice(item.price * item.quantity)}</strong></div>)}
        </div>
      </OrderSummary>
    </div>
  );
}

export function OrderSuccessPage() {
  const location = useLocation();
  const [params] = useSearchParams();
  const result = location.state;
  const paytrReturn = params.get("paytr") === "1";
  return (
    <div className="success-page">
      <div className="success-check"><Check /></div>
      <p className="eyebrow">SİPARİŞİNİZ ALINDI</p>
      <h1>Teşekkür ederiz.</h1>
      <p>{paytrReturn ? "Ödeme dönüşünüz alındı. Siparişinizin kesin durumu PayTR bildirimi geldikten sonra hesabınızda güncellenecek." : "Siparişiniz başarıyla oluşturuldu. Hazırlık sürecini yönetim panelinden takip edebilirsiniz."}</p>
      {result && <div className="order-number"><span>Sipariş numarası</span><strong>{result.orderNo}</strong></div>}
      <Link className="button dark" to="/">ANASAYFAYA DÖN</Link>
    </div>
  );
}

export function PaytrPaymentPage() {
  const { orderNo } = useParams();
  const location = useLocation();
  const [paytr, setPaytr] = useState(location.state?.paytr || null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (document.querySelector("script[data-paytr-resizer]")) return;
    const script = document.createElement("script");
    script.src = "https://www.paytr.com/js/iframeResizer.min.js";
    script.async = true;
    script.dataset.paytrResizer = "true";
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (paytr?.iframeUrl || !orderNo) return;
    api(`/api/paytr/orders/${orderNo}/iframe-token`, { method: "POST" })
      .then((result) => setPaytr(result.paytr))
      .catch((requestError) => setError(requestError.message));
  }, [orderNo, paytr?.iframeUrl]);

  useEffect(() => {
    if (!paytr?.iframeUrl) return;
    const timer = window.setTimeout(() => {
      if (window.iFrameResize) window.iFrameResize({}, "#paytriframe");
    }, 600);
    return () => window.clearTimeout(timer);
  }, [paytr?.iframeUrl]);

  return (
    <div className="paytr-page">
      <div className="paytr-head">
        <p className="eyebrow">GÜVENLİ ÖDEME</p>
        <h1>Kart ile ödeme</h1>
        <p>Sipariş No: <strong>{orderNo}</strong></p>
      </div>
      {error && <div className="form-error">{error}</div>}
      {!error && !paytr?.iframeUrl && <Loading />}
      {paytr?.iframeUrl && (
        <iframe
          id="paytriframe"
          title="PayTR Güvenli Ödeme"
          src={paytr.iframeUrl}
          frameBorder="0"
          scrolling="no"
          className="paytr-iframe"
        />
      )}
    </div>
  );
}

export function PaymentFailurePage() {
  const [params] = useSearchParams();
  const orderNo = params.get("order");
  return (
    <div className="success-page payment-failed-page">
      <div className="success-check failed"><X /></div>
      <p className="eyebrow">ÖDEME TAMAMLANAMADI</p>
      <h1>Ödeme başarısız oldu.</h1>
      <p>İsterseniz sepetinize dönüp tekrar deneyebilir veya bizimle iletişime geçebilirsiniz.</p>
      {orderNo && <div className="order-number"><span>Sipariş numarası</span><strong>{orderNo}</strong></div>}
      <Link className="button dark" to="/sepet">SEPETE DÖN</Link>
    </div>
  );
}

export function InfoPage({ type }) {
  const { settings } = useStore();
  const isContact = type === "contact";
  return (
    <div className="info-page">
      <p className="eyebrow">ASLIM BOUTIQUE</p>
      <h1>{isContact ? "WhatsApp" : "Sıkça Sorulan Sorular"}</h1>
      {isContact ? (
        <div className="contact-card">
          <div><span>Hızlı iletişim</span><strong>{settings.phone}</strong></div>
          <div><span>Mesaj gönderin</span><a className="button dark" href={whatsappUrl(settings)} target="_blank" rel="noreferrer"><MessageCircle size={18} /> WHATSAPP</a></div>
          <div><span>Adres</span><strong>{settings.address}</strong></div>
        </div>
      ) : (
        <div className="faq-list">
          <details open><summary>Kargom ne zaman gönderilir?</summary><p>Siparişler genellikle 1-3 iş günü içinde hazırlanıp kargoya teslim edilir.</p></details>
          <details><summary>İade süresi kaç gün?</summary><p>Ürünlerinizi teslim aldıktan sonra {settings.returnDays || 15} iş günü içinde iade talebi oluşturabilirsiniz.</p></details>
          <details><summary>Nasıl ödeme yapabilirim?</summary><p>Ödemeler PayTR güvenli ödeme altyapısı üzerinden kart ile alınır.</p></details>
        </div>
      )}
    </div>
  );
}

export function CustomerAuthPage({ mode }) {
  const register = mode === "register";
  const { customer, refreshAuth } = useStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (customer) navigate("/hesabim", { replace: true });
  }, [customer, navigate]);

  function update(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (register && form.password !== form.confirmPassword) {
      setError("Şifreler eşleşmiyor.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await api(register ? "/api/auth/register" : "/api/auth/login", {
        method: "POST",
        body: JSON.stringify(form)
      });
      if (result.admin) {
        await refreshAuth();
        navigate(result.redirect || "/admin");
        return;
      }
      if (result.developmentCode) sessionStorage.setItem("aslim-verification-code", result.developmentCode);
      await refreshAuth();
      navigate(register ? "/hesabim?bolum=profile" : "/hesabim");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="customer-auth-page">
      <section className="customer-auth-copy">
        <p className="eyebrow">ASLIM BOUTIQUE</p>
        <h1>{register ? "Aramıza katılın." : "Tekrar hoş geldiniz."}</h1>
        <p>{register ? "Siparişlerinizi daha kolay yönetmek için hesabınızı oluşturun." : "Hesabınıza giriş yaparak alışverişinize devam edin."}</p>
      </section>
      <form className="customer-auth-form" onSubmit={submit}>
        <h2>{register ? "Kayıt Ol" : "Giriş Yap"}</h2>
        {error && <div className="form-error">{error}</div>}
        {register && <label>Ad soyad<input name="name" value={form.name} onChange={update} autoComplete="name" required /></label>}
        <label>E-posta<input type="email" name="email" value={form.email} onChange={update} autoComplete="email" required /></label>
        <label>Şifre<input type="password" name="password" value={form.password} onChange={update} autoComplete={register ? "new-password" : "current-password"} minLength={register ? 8 : undefined} required /></label>
        {register && <label>Şifre tekrar<input type="password" name="confirmPassword" value={form.confirmPassword} onChange={update} autoComplete="new-password" required /></label>}
        <button className="button dark full" disabled={submitting}>{submitting ? "LÜTFEN BEKLEYİN..." : register ? "KAYIT OL" : "GİRİŞ YAP"}</button>
        <p>{register ? "Zaten hesabınız var mı?" : "Henüz hesabınız yok mu?"} <Link to={register ? "/giris" : "/kayit-ol"}>{register ? "Giriş yapın" : "Kayıt olun"}</Link></p>
      </form>
    </div>
  );
}

export function CustomerAccountPage() {
  const { customer, authLoading, refreshAuth, products, favoriteIds } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const requestedSection = new URLSearchParams(location.search).get("bolum");
  const [activeSection, setActiveSection] = useState(requestedSection === "profile" ? "profile" : "orders");
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [profile, setProfile] = useState({ name: "", email: "", phone: "" });
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationMessage, setVerificationMessage] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const [developmentCode, setDevelopmentCode] = useState(() => sessionStorage.getItem("aslim-verification-code") || "");
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    verificationCode: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordDevelopmentCode, setPasswordDevelopmentCode] = useState("");

  useEffect(() => {
    if (!authLoading && !customer) navigate("/giris", { replace: true });
  }, [authLoading, customer, navigate]);

  useEffect(() => {
    if (!customer) return;
    setOrdersLoading(true);
    api("/api/account/orders")
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setOrdersLoading(false));
  }, [customer]);

  useEffect(() => {
    if (!customer) return;
    setProfile({ name: customer.name || "", email: customer.email || "", phone: customer.phone || "" });
  }, [customer]);

  useEffect(() => {
    if (requestedSection === "profile") setActiveSection("profile");
  }, [requestedSection]);

  async function saveProfile(event) {
    event.preventDefault();
    setProfileSaving(true);
    setProfileMessage("");
    setProfileError("");
    try {
      const result = await api("/api/account/profile", {
        method: "PUT",
        body: JSON.stringify(profile)
      });
      if (result.developmentCode) {
        sessionStorage.setItem("aslim-verification-code", result.developmentCode);
        setDevelopmentCode(result.developmentCode);
      }
      setProfileMessage(result.message);
      await refreshAuth();
    } catch (error) {
      setProfileError(error.message);
    } finally {
      setProfileSaving(false);
    }
  }

  async function sendVerificationCode(purpose = "email_verification") {
    setVerificationError("");
    setPasswordError("");
    try {
      const result = await api("/api/account/verification/send", {
        method: "POST",
        body: JSON.stringify({ purpose })
      });
      if (purpose === "password_change") {
        setPasswordMessage(result.message);
        setPasswordDevelopmentCode(result.developmentCode || "");
      } else {
        setVerificationMessage(result.message);
        if (result.developmentCode) {
          sessionStorage.setItem("aslim-verification-code", result.developmentCode);
          setDevelopmentCode(result.developmentCode);
        }
      }
    } catch (error) {
      if (purpose === "password_change") setPasswordError(error.message);
      else setVerificationError(error.message);
    }
  }

  async function confirmEmail(event) {
    event.preventDefault();
    setVerificationError("");
    setVerificationMessage("");
    try {
      const result = await api("/api/account/verification/confirm", {
        method: "POST",
        body: JSON.stringify({ code: verificationCode })
      });
      setVerificationMessage(result.message);
      setVerificationCode("");
      setDevelopmentCode("");
      sessionStorage.removeItem("aslim-verification-code");
      await refreshAuth();
    } catch (error) {
      setVerificationError(error.message);
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    setPasswordError("");
    setPasswordMessage("");
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("Yeni şifreler eşleşmiyor.");
      return;
    }
    setPasswordSaving(true);
    try {
      const result = await api("/api/account/password", {
        method: "PUT",
        body: JSON.stringify(passwordForm)
      });
      setPasswordMessage(result.message);
      setPasswordForm({ currentPassword: "", verificationCode: "", newPassword: "", confirmPassword: "" });
      setPasswordDevelopmentCode("");
    } catch (error) {
      setPasswordError(error.message);
    } finally {
      setPasswordSaving(false);
    }
  }

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    navigate("/", { replace: true });
    await refreshAuth();
  }

  if (authLoading || !customer) return <Loading />;
  const favoriteProducts = products.filter((product) => favoriteIds.includes(Number(product.id)));

  const sections = [
    { id: "profile", label: "Kişisel Bilgilerim", group: "Kişisel Bilgilerim" },
    { id: "addresses", label: "Adreslerim", group: "Kişisel Bilgilerim" },
    { id: "favorites", label: "Beğendiğim Ürünler", group: "Kişisel Bilgilerim" },
    { id: "orders", label: "Siparişlerim", group: "Sipariş Bilgilerim" }
  ];

  const sectionTitle = {
    profile: "Kişisel Bilgilerim",
    addresses: "Adreslerim",
    favorites: "Beğendiğim Ürünler",
    orders: `Siparişlerim (${orders.length})`
  }[activeSection];

  return (
    <div className="account-page">
      <aside className="account-sidebar">
        <div className="account-user">
          <div className="account-avatar">{customer.name.slice(0, 1).toLocaleUpperCase("tr-TR")}</div>
          <div>
            <strong>{customer.name}</strong>
            <button className="account-logout" onClick={logout}><LogOut size={15} /> Çıkış yap</button>
          </div>
        </div>

        <div className="account-menu-groups">
          {["Kişisel Bilgilerim", "Sipariş Bilgilerim"].map((group) => (
            <div className="account-menu-group" key={group}>
              <h2>{group}</h2>
              {sections.filter((section) => section.group === group).map((section) => (
                <button
                  key={section.id}
                  className={activeSection === section.id ? "active" : ""}
                  onClick={() => setActiveSection(section.id)}
                >
                  {section.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      </aside>

      <section className="account-content">
        <div className="account-content-head">
          <p className="eyebrow">HESABIM</p>
          <h1>{sectionTitle}</h1>
        </div>

        {activeSection === "orders" && (
          ordersLoading ? <Loading /> : orders.length ? (
            <div className="account-orders">
              {orders.map((order) => (
                <article className="account-order-card" key={order.id}>
                  <div className="account-order-head">
                    <div><span>Sipariş No</span><strong>{order.order_no}</strong></div>
                    <div><span>Tarih</span><strong>{formatDate(order.created_at)}</strong></div>
                    <div><span>Durum</span><strong className="order-status">{order.status}</strong></div>
                    <div><span>Toplam</span><strong>{formatPrice(order.total)}</strong></div>
                  </div>
                  {(order.tracking_code || order.cancel_reason) && (
                    <div className="account-order-meta">
                      {order.tracking_code && <div><span>Kargo takip kodu</span><strong>{order.tracking_code}</strong></div>}
                      {order.cancel_reason && <div><span>İptal sebebi</span><strong>{order.cancel_reason}</strong></div>}
                    </div>
                  )}
                  <div className="account-order-items">
                    {order.items.map((item, index) => (
                      <Link to={`/urun/${item.slug}`} key={`${item.productId}-${index}`}>
                        <img src={item.image || "/images/hero-scarf.webp"} alt={item.name} />
                        <span>
                          <strong>{item.name}</strong>
                          <small>{[item.color, item.size, `${item.quantity} adet`].filter(Boolean).join(" · ")}</small>
                        </span>
                      </Link>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="account-empty">
              <ShoppingBag size={35} strokeWidth={1.4} />
              <p>Henüz sipariş verilmedi. <Link to="/kategori/new-drop">Ürünlere göz at</Link></p>
            </div>
          )
        )}

        {activeSection === "profile" && (
          <div className="account-settings-stack">
            <form className="account-settings-card" onSubmit={saveProfile}>
              <div className="account-card-title">
                <div>
                  <h2>Kişisel bilgiler</h2>
                  <p>Hesabınızda kullanılan ad, e-posta ve telefon bilgilerini yönetin.</p>
                </div>
                <div className="verification-badges">
                  <span className={customer.email_verified ? "verification-badge verified" : "verification-badge"}>
                    {customer.email_verified ? <><Check size={14} /> E-posta doğrulandı</> : "E-posta doğrulanmadı"}
                  </span>
                </div>
              </div>
              {profileError && <div className="form-error">{profileError}</div>}
              {profileMessage && <div className="form-success">{profileMessage}</div>}
              <div className="account-form-grid">
                <label>Ad soyad<input value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} required /></label>
                <label>Telefon<input type="tel" value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} placeholder="+90 5xx xxx xx xx" required /></label>
                <label className="wide">E-posta<input type="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} required /></label>
              </div>
              <button className="button dark" disabled={profileSaving}>
                {profileSaving ? "KAYDEDİLİYOR..." : "BİLGİLERİ KAYDET"}
              </button>
            </form>

            {!customer.email_verified && (
              <form className="account-settings-card verification-card" onSubmit={confirmEmail}>
                <div className="account-card-title">
                  <div>
                    <h2>E-posta doğrulama</h2>
                    <p>{customer.email} adresine gönderilen 6 haneli kodu girin.</p>
                  </div>
                  <ShieldCheck size={24} strokeWidth={1.5} />
                </div>
                {verificationError && <div className="form-error">{verificationError}</div>}
                {verificationMessage && <div className="form-success">{verificationMessage}</div>}
                {developmentCode && <div className="development-code">Yerel doğrulama kodu: <strong>{developmentCode}</strong></div>}
                <div className="verification-row">
                  <input
                    inputMode="numeric"
                    maxLength="6"
                    value={verificationCode}
                    onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, ""))}
                    placeholder="6 haneli kod"
                    required
                  />
                  <button className="button dark">DOĞRULA</button>
                  <button type="button" className="text-action" onClick={() => sendVerificationCode()}>
                    Kodu tekrar gönder
                  </button>
                </div>
              </form>
            )}
            <form className="account-settings-card" onSubmit={changePassword}>
              <div className="account-card-title">
                <div>
                  <h2>Şifre değiştir</h2>
                  <p>Mevcut şifrenizi veya e-postanıza gelen doğrulama kodunu kullanın.</p>
                </div>
                <LockKeyhole size={24} strokeWidth={1.5} />
              </div>
              {passwordError && <div className="form-error">{passwordError}</div>}
              {passwordMessage && <div className="form-success">{passwordMessage}</div>}
              {passwordDevelopmentCode && <div className="development-code">Yerel şifre kodu: <strong>{passwordDevelopmentCode}</strong></div>}
              <div className="account-form-grid">
                <label>Mevcut şifre<input type="password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })} autoComplete="current-password" /></label>
                <label>Ya da e-posta kodu<input inputMode="numeric" maxLength="6" value={passwordForm.verificationCode} onChange={(event) => setPasswordForm({ ...passwordForm, verificationCode: event.target.value.replace(/\D/g, "") })} /></label>
                <label>Yeni şifre<input type="password" minLength="8" value={passwordForm.newPassword} onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })} autoComplete="new-password" required /></label>
                <label>Yeni şifre tekrar<input type="password" minLength="8" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })} autoComplete="new-password" required /></label>
              </div>
              <div className="account-form-actions">
                <button className="button dark" disabled={passwordSaving}>
                  {passwordSaving ? "GÜNCELLENİYOR..." : "ŞİFREYİ GÜNCELLE"}
                </button>
                <button type="button" className="text-action" onClick={() => sendVerificationCode("password_change")}>
                  E-postama kod gönder
                </button>
              </div>
            </form>
          </div>
        )}

        {activeSection === "addresses" && (
          <div className="account-empty">
            <MapPin size={35} strokeWidth={1.4} />
            <p>Henüz kayıtlı adresiniz yok. Sipariş sırasında girdiğiniz adresi kullanabilirsiniz.</p>
          </div>
        )}

        {activeSection === "favorites" && (
          favoriteProducts.length ? (
            <div className="product-grid account-favorites-grid">
              {favoriteProducts.map((product) => <ProductCard product={product} key={product.id} />)}
            </div>
          ) : (
            <div className="account-empty">
              <Heart size={35} strokeWidth={1.4} />
              <p>Henüz beğendiğiniz bir ürün yok. <Link to="/kategori/new-drop">Yeni ürünleri keşfedin</Link></p>
            </div>
          )
        )}
      </section>
    </div>
  );
}

export function NotFound() {
  return <div className="empty-state"><h1>Sayfa bulunamadı.</h1><Link to="/">Anasayfaya dön</Link></div>;
}

function Loading() {
  return <div className="loading"><span /><span /><span /></div>;
}




