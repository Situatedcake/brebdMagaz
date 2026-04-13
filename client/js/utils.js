export function formatPrice(value) {
  return `$${Number(value).toFixed(2)}`;
}

export function getQueryParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

export function showMessage(element, text, isError = false) {
  if (!element) return;
  element.textContent = text;
  element.style.color = isError ? "#b74444" : "#2e6fa3";
}

export async function compressImageFile(file, maxWidth = 512, quality = 0.78) {
  if (!file || !file.type.startsWith("image/")) {
    throw new Error("Нужно выбрать изображение");
  }

  const imageBitmap = await createImageBitmap(file);
  const ratio = Math.min(1, maxWidth / imageBitmap.width);
  const width = Math.max(1, Math.round(imageBitmap.width * ratio));
  const height = Math.max(1, Math.round(imageBitmap.height * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(imageBitmap, 0, 0, width, height);

  const blob = await new Promise((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", quality);
  });

  if (!blob) {
    throw new Error("Не удалось сжать изображение");
  }

  return new File([blob], `avatar_${Date.now()}.jpg`, { type: "image/jpeg" });
}

export function getProductImages(product) {
  const fromArray = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
  if (fromArray.length > 0) return fromArray.slice(0, 8);
  if (product.image) return [product.image];
  return [];
}

export function getProductMainImage(product) {
  const images = getProductImages(product);
  return (
    images[0] ||
    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80"
  );
}
