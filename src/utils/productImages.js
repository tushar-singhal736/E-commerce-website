export const PRODUCT_PLACEHOLDER =
  'https://images.unsplash.com/photo-1560393464-5c69a73c5770?q=80&w=800&auto=format&fit=crop';

export const getProductImages = (product, fallback = PRODUCT_PLACEHOLDER) => {
  const images = Array.isArray(product?.images) ? product.images : [];
  const normalized = [
    product?.image,
    ...images,
  ]
    .map((image) => String(image || '').trim())
    .filter(Boolean);

  return normalized.length > 0 ? [...new Set(normalized)] : [fallback];
};

export const getProductImage = (product, fallback = PRODUCT_PLACEHOLDER) => (
  getProductImages(product, fallback)[0]
);

export const handleImageFallback = (fallback = PRODUCT_PLACEHOLDER) => (event) => {
  if (event.currentTarget.src !== fallback) {
    event.currentTarget.src = fallback;
  }
};
