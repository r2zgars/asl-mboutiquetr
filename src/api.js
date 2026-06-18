export async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "include",
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...options.headers
    },
    ...options
  });

  const data = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message || "İşlem tamamlanamadı.");
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
