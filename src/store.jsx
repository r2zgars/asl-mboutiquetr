import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, getVariantImages } from "./api";

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [store, setStore] = useState({ settings: {}, categories: [], products: [] });
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState(null);
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("aslim-cart") || "[]");
    } catch {
      return [];
    }
  });

  async function refreshStore() {
    setLoading(true);
    try {
      setStore(await api("/api/store"));
    } finally {
      setLoading(false);
    }
  }

  async function refreshAuth() {
    setAuthLoading(true);
    const status = await api("/api/auth/status").catch(() => ({ customer: null, adminAuthenticated: false }));
    setCustomer(status.customer);
    setAdminAuthenticated(status.adminAuthenticated);
    setAuthLoading(false);
    return status;
  }

  useEffect(() => {
    refreshStore();
    refreshAuth();
  }, []);

  useEffect(() => {
    if (!customer) {
      setFavoriteIds([]);
      return;
    }
    api("/api/account/favorites")
      .then((favorites) => setFavoriteIds(favorites.map((product) => Number(product.id))))
      .catch(() => setFavoriteIds([]));
  }, [customer?.id]);

  useEffect(() => {
    localStorage.setItem("aslim-cart", JSON.stringify(cart));
  }, [cart]);

  function addToCart(product, options = {}) {
    const key = `${product.id}-${options.size || ""}-${options.color || ""}`;
    setCart((current) => {
      const existing = current.find((item) => item.key === key);
      if (existing) {
        return current.map((item) =>
          item.key === key
            ? { ...item, quantity: Math.min(product.stock, item.quantity + (options.quantity || 1)) }
            : item
        );
      }
      return [
        ...current,
        {
          key,
          productId: product.id,
          slug: product.slug,
          name: product.name,
          image: getVariantImages(product, options.color, options.size)[0] || product.images?.[0] || "",
          price: product.price,
          stock: product.stock,
          size: options.size || "",
          color: options.color || "",
          quantity: options.quantity || 1
        }
      ];
    });
  }

  function updateQuantity(key, quantity) {
    setCart((current) =>
      current
        .map((item) => (item.key === key ? { ...item, quantity: Math.max(0, Math.min(item.stock, quantity)) } : item))
        .filter((item) => item.quantity > 0)
    );
  }

  function removeFromCart(key) {
    setCart((current) => current.filter((item) => item.key !== key));
  }

  async function toggleFavorite(productId) {
    if (!customer) return false;
    const normalizedId = Number(productId);
    const favorite = favoriteIds.includes(normalizedId);
    if (favorite) {
      await api(`/api/account/favorites/${normalizedId}`, { method: "DELETE" });
      setFavoriteIds((current) => current.filter((id) => id !== normalizedId));
    } else {
      await api(`/api/account/favorites/${normalizedId}`, { method: "POST" });
      setFavoriteIds((current) => [...new Set([...current, normalizedId])]);
    }
    return !favorite;
  }

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping =
    subtotal === 0 || subtotal >= Number(store.settings.freeShippingThreshold || 0)
      ? 0
      : Number(store.settings.shippingFee || 0);

  const value = useMemo(
    () => ({
      ...store,
      loading,
      authLoading,
      customer,
      adminAuthenticated,
      favoriteIds,
      cart,
      cartCount,
      subtotal,
      shipping,
      total: subtotal + shipping,
      addToCart,
      updateQuantity,
      removeFromCart,
      toggleFavorite,
      clearCart: () => setCart([]),
      refreshStore,
      refreshAuth,
      setCustomer
    }),
    [store, loading, authLoading, customer, adminAuthenticated, favoriteIds, cart, cartCount, subtotal, shipping]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  return useContext(StoreContext);
}
