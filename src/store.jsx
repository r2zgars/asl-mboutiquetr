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
    setFavoriteIds((current) =>
      favorite
        ? current.filter((id) => id !== normalizedId)
        : [...new Set([...current, normalizedId])]
    );
    if (favorite) {
      try {
        await api(`/api/account/favorites/${normalizedId}`, { method: "DELETE" });
      } catch (error) {
        setFavoriteIds((current) => [...new Set([...current, normalizedId])]);
        throw error;
      }
    } else {
      try {
        await api(`/api/account/favorites/${normalizedId}`, { method: "POST" });
      } catch (error) {
        setFavoriteIds((current) => current.filter((id) => id !== normalizedId));
        throw error;
      }
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
