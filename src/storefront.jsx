import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Heart,
  Home,
  Instagram,
  LayoutGrid,
  LockKeyhole,
  LogOut,
  MessageCircle,
  Menu,
  PackageCheck,
  Search,
  ShieldCheck,
  ShoppingBag,
  Truck,
  UserRound,
  X
} from "lucide-react";
import { Link, Outlet, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, formatPrice, getVariantImages } from "./api";
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

function productPath(product) {
  if (!product) return "/";
  return product.category_slug ? `/kategori/${product.category_slug}/${product.slug}` : `/urun/${product.slug}`;
}

function productWhatsappMessage(product) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://aslimboutique.vercel.app";
  return `${origin}${productPath(product)} Bu ürün hakkında bilgi almak istiyorum.`;
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
  const { customer } = useStore();
  const location = useLocation();
  const links = [
    { to: "/", label: "Ana Sayfa", icon: Home },
    { to: "/kategori/new-drop", label: "New Drop", icon: LayoutGrid },
    { to: customer ? "/hesabim?bolum=favorites" : "/giris", label: "Favoriler", icon: Heart },
    { to: customer ? "/hesabim" : "/giris", label: "Hesabım", icon: UserRound }
  ];

  return (
    <nav className="mobile-app-nav" aria-label="Mobil hızlı menü">
      {links.map(({ to, label, icon: Icon, badge }) => {
        const targetPath = to.split("?")[0];
        const active = label === "Favoriler"
          ? location.pathname === "/hesabim" && location.search.includes("favorites")
          : targetPath === "/"
            ? location.pathname === "/"
            : location.pathname.startsWith(targetPath) && label !== "Favoriler";
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
  const { settings, categories, customer, adminAuthenticated } = useStore();
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
      <div><ShieldCheck /><span><strong>{settings.trustTitle1 || "Güvenli alışveriş"}</strong><small>{settings.trustText1 || "256 Bit SSL koruması"}</small></span></div>
      <div><Truck /><span><strong>{settings.trustTitle2 || "Hızlı gönderim"}</strong><small>{settings.trustText2 || "Özenli ve takipli teslimat"}</small></span></div>
      <div><PackageCheck /><span><strong>{settings.trustTitle3 || "Kolay iade"}</strong><small>{settings.trustText3 || "3 iş günü içinde"}</small></span></div>
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
  const [saving, setSaving] = useState(false);
  const favorite = favoriteIds.includes(Number(productId));

  async function toggle(event) {
    event.preventDefault();
    event.stopPropagation();
    if (saving) return;
    if (!customer) {
      navigate("/giris");
      return;
    }
    setSaving(true);
    try {
      await toggleFavorite(productId);
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      type="button"
      className={`favorite-button ${favorite ? "active" : ""} ${saving ? "saving" : ""} ${className}`}
      onClick={toggle}
      aria-label={favorite ? "Beğenilenlerden çıkar" : "Beğenilenlere ekle"}
      title={favorite ? "Beğenilenlerden çıkar" : "Beğenilenlere ekle"}
    >
      <Heart size={20} fill={favorite ? "currentColor" : "none"} />
    </button>
  );
}

export function ProductCard({ product }) {
  const soldOut = product.stock <= 0;
  const path = productPath(product);

  return (
    <article className="product-card reveal">
      <Link to={path} className="product-image">
        <img src={product.images?.[0] || "/images/hero-scarf.webp"} alt={product.name} />
        {product.compare_price > product.price && (
          <span className="discount">-%{Math.round((1 - product.price / product.compare_price) * 100)}</span>
        )}
        {soldOut && <span className="sold-out">STOKTA YOK</span>}
      </Link>
      <FavoriteButton productId={product.id} className="product-card-favorite" />
      <div className="product-card-body">
        <Link to={path}>
          <p className="product-category">{product.category_name}</p>
          <h3>{product.name}</h3>
        </Link>
        <div className="price-row">
          <strong>{formatPrice(product.price)}</strong>
          {product.compare_price > product.price && <del>{formatPrice(product.compare_price)}</del>}
        </div>
        <Link className={`quick-add ${soldOut ? "disabled" : ""}`} to={path}>
          {soldOut ? "STOKTA YOK" : "ÜRÜNÜ İNCELE"}
        </Link>
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
  const { slug, productSlug } = useParams();
  const { products, loading, settings } = useStore();
  const product = products.find((item) => item.slug === (productSlug || slug));
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [previewImage, setPreviewImage] = useState("");
  const galleryImages = getVariantImages(product, color, size);

  useEffect(() => {
    if (product) {
      setSize(product.sizes?.[0] || "");
      setColor(product.colors?.[0] || "");
    }
  }, [product]);

  if (loading) return <Loading />;
  if (!product) return <NotFound />;
  const buyHref = whatsappUrl(settings, productWhatsappMessage(product));

  return (
    <div className="product-page reveal">
      <div className="product-gallery variant-gallery" key={`${color}-${size}`}>
        {(galleryImages.length ? galleryImages : ["/images/hero-scarf.webp"]).map((image) => (
          <button className="product-gallery-item" key={image} type="button" onClick={() => setPreviewImage(image)}>
            <img src={image} alt={product.name} />
          </button>
        ))}
      </div>
      {previewImage && (
        <div className="image-lightbox" onClick={() => setPreviewImage("")}>
          <button className="image-lightbox-close" type="button" onClick={() => setPreviewImage("")}>
            <X size={24} />
          </button>
          <img src={previewImage} alt={product.name} onClick={(event) => event.stopPropagation()} />
        </div>
      )}
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
            <div><strong>Beden</strong></div>
            <div className="choice-row">
              {product.sizes.map((item) => <button className={size === item ? "selected" : ""} onClick={() => setSize(item)} key={item}>{item}</button>)}
            </div>
          </div>
        )}
        <div className="purchase-row">
          {product.stock > 0 ? (
            <a className="button dark add-button" href={buyHref} target="_blank" rel="noreferrer">
              SATIN AL
            </a>
          ) : (
            <button className="button dark add-button" disabled>STOKTA YOK</button>
          )}
        </div>
        <div className="stock-note">{product.stock > 0 ? `Stokta ${product.stock} adet` : "Stokta yok"}</div>
        <div className="product-description">
          <h2>Ürün açıklaması</h2>
          <p>{product.description}</p>
          <p className="sku">Ürün kodu: {product.sku}</p>
        </div>
        <div className="product-benefits">
          <div><Truck /><span><strong>Hızlı gönderim</strong>1-3 iş günü içinde kargoda</span></div>
          <div><MessageCircle /><span><strong>WhatsApp ile satın alma</strong>Ürün linki mesajınıza otomatik eklenir</span></div>
        </div>
      </div>
    </div>
  );
}

export function InfoPage({ type }) {
  const { settings } = useStore();
  const isContact = type === "contact";
  const faqItems = (settings.faqItems?.length ? settings.faqItems : [
    {
      question: "Nasıl satın alabilirim?",
      answer: "Ürün sayfasındaki Satın Al butonu sizi WhatsApp görüşmesine yönlendirir."
    }
  ]).filter((item) => item.question && item.answer);
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
          {faqItems.map((item, index) => (
            <details key={`${item.question}-${index}`} open={index === 0}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

export function CustomerAuthPage({ mode }) {
  const register = mode === "register";
  const { customer, refreshAuth, settings } = useStore();
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
      <section
        className="customer-auth-copy"
        style={{ backgroundImage: `url("${settings.authImage || "/images/hero-vest.webp"}")` }}
      >
        <div>
          <p className="eyebrow">{settings.authEyebrow || "ASLIM BOUTIQUE"}</p>
          <h1>{register ? (settings.authRegisterTitle || "Aramıza katılın.") : (settings.authLoginTitle || "Tekrar hoş geldiniz.")}</h1>
          <p>{register ? (settings.authRegisterText || "Favorilerinizi saklamak için hesabınızı oluşturun.") : (settings.authLoginText || "Hesabınıza giriş yaparak favorilerinize devam edin.")}</p>
        </div>
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
  const [activeSection, setActiveSection] = useState(requestedSection === "favorites" ? "favorites" : "profile");
  const [profile, setProfile] = useState({ name: "", email: "", phone: "" });
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !customer) navigate("/giris", { replace: true });
  }, [authLoading, customer, navigate]);

  useEffect(() => {
    if (!customer) return;
    setProfile({ name: customer.name || "", email: customer.email || "", phone: customer.phone || "" });
  }, [customer]);

  useEffect(() => {
    setActiveSection(requestedSection === "favorites" ? "favorites" : "profile");
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
      setProfileMessage(result.message);
      await refreshAuth();
    } catch (error) {
      setProfileError(error.message);
    } finally {
      setProfileSaving(false);
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
    if (!passwordForm.currentPassword) {
      setPasswordError("Şifrenizi değiştirmek için mevcut şifrenizi girin.");
      return;
    }
    setPasswordSaving(true);
    try {
      const result = await api("/api/account/password", {
        method: "PUT",
        body: JSON.stringify(passwordForm)
      });
      setPasswordMessage(result.message);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
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
    { id: "profile", label: "Kişisel Bilgilerim" },
    { id: "favorites", label: "Beğendiğim Ürünler" }
  ];
  const sectionTitle = activeSection === "favorites" ? "Beğendiğim Ürünler" : "Kişisel Bilgilerim";

  return (
    <div className="account-page compact-account-page">
      <aside className="account-sidebar">
        <div className="account-user">
          <div className="account-avatar">{customer.name.slice(0, 1).toLocaleUpperCase("tr-TR")}</div>
          <div>
            <strong>{customer.name}</strong>
            <button className="account-logout" onClick={logout}><LogOut size={15} /> Çıkış yap</button>
          </div>
        </div>

        <div className="account-menu-groups">
          <div className="account-menu-group">
            <h2>Hesabım</h2>
            {sections.map((section) => (
              <button
                key={section.id}
                className={activeSection === section.id ? "active" : ""}
                onClick={() => setActiveSection(section.id)}
              >
                {section.label}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <section className="account-content">
        <div className="account-content-head">
          <p className="eyebrow">HESABIM</p>
          <h1>{sectionTitle}</h1>
        </div>

        {activeSection === "profile" && (
          <div className="account-settings-stack">
            <form className="account-settings-card" onSubmit={saveProfile}>
              <div className="account-card-title">
                <div>
                  <h2>Kişisel bilgiler</h2>
                  <p>Ad, e-posta ve telefon bilgilerinizi buradan güncelleyin.</p>
                </div>
                <UserRound size={24} strokeWidth={1.5} />
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

            <form className="account-settings-card" onSubmit={changePassword}>
              <div className="account-card-title">
                <div>
                  <h2>Şifre değiştir</h2>
                  <p>Şifrenizi değiştirmek için mevcut şifrenizi girin.</p>
                </div>
                <LockKeyhole size={24} strokeWidth={1.5} />
              </div>
              {passwordError && <div className="form-error">{passwordError}</div>}
              {passwordMessage && <div className="form-success">{passwordMessage}</div>}
              <div className="account-form-grid">
                <label className="wide">Mevcut şifre<input type="password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })} autoComplete="current-password" required /></label>
                <label>Yeni şifre<input type="password" minLength="8" value={passwordForm.newPassword} onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })} autoComplete="new-password" required /></label>
                <label>Yeni şifre tekrar<input type="password" minLength="8" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })} autoComplete="new-password" required /></label>
              </div>
              <button className="button dark" disabled={passwordSaving}>
                {passwordSaving ? "GÜNCELLENİYOR..." : "ŞİFREYİ GÜNCELLE"}
              </button>
            </form>
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




