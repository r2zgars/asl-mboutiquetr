import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "./api";

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [store, setStore] = useState({ settings: {}, categories: [], products: [] });
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState(null);
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState([]);

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

  const value = useMemo(
    () => ({
      ...store,
      loading,
      authLoading,
      customer,
      adminAuthenticated,
      favoriteIds,
      toggleFavorite,
      refreshStore,
      refreshAuth,
      setCustomer
    }),
    [store, loading, authLoading, customer, adminAuthenticated, favoriteIds]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  return useContext(StoreContext);
}
