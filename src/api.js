export async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "include",
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...options.headers
    },
    ...options
  });

  const text = response.status === 204 ? "" : await response.text().catch(() => "");
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const fallback = response.status === 413
      ? "Görsel çok büyük. Daha küçük bir fotoğraf deneyin."
      : text || "İşlem tamamlanamadı.";
    throw new Error(data?.message || fallback);
  }
  return data;
}

export const formatPrice = (value) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(Number(value || 0));

export const formatDate = (value) =>
  new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export function getVariantImages(product, color = "", size = "") {
  const variants = Array.isArray(product?.variant_images) ? product.variant_images : [];
  const match =
    variants.find((variant) => variant.color === color && variant.size === size) ||
    variants.find((variant) => variant.color === color && !variant.size) ||
    variants.find((variant) => variant.size === size && !variant.color);
  return match?.images?.length ? match.images : product?.images || [];
}
