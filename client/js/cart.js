import { apiRequest } from "./api.js";
import { getCurrentUser, isAuthorized, setCurrentUser } from "./auth.js";

const GUEST_CART_KEY = "guestCart";

export function getGuestCart() {
  const raw = localStorage.getItem(GUEST_CART_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (error) {
    return [];
  }
}

export function saveGuestCart(items) {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
}

export function clearGuestCart() {
  localStorage.removeItem(GUEST_CART_KEY);
}

export async function getCart() {
  if (!isAuthorized()) {
    return getGuestCart();
  }

  const data = await apiRequest("/cart");
  return data.cart || [];
}

export async function addToCart(productId, size = "", quantity = 1) {
  if (!isAuthorized()) {
    const cart = getGuestCart();
    const index = cart.findIndex((item) => item.productId === productId && item.size === size);
    if (index === -1) {
      cart.push({ productId, size, quantity });
    } else {
      cart[index].quantity += quantity;
    }
    saveGuestCart(cart);
    return cart;
  }

  const data = await apiRequest("/cart", {
    method: "POST",
    body: JSON.stringify({ productId, size, quantity }),
  });
  return data.cart;
}

export async function updateCart(items, merge = false) {
  if (!isAuthorized()) {
    saveGuestCart(items);
    return items;
  }

  const data = await apiRequest(`/cart?merge=${merge}`, {
    method: "PUT",
    body: JSON.stringify({ items }),
  });
  return data.cart;
}

export async function deleteCartItem(productId, size = "") {
  if (!isAuthorized()) {
    const next = getGuestCart().filter(
      (item) => !(item.productId === productId && item.size === size)
    );
    saveGuestCart(next);
    return next;
  }

  const data = await apiRequest(`/cart/${productId}?size=${encodeURIComponent(size)}`, {
    method: "DELETE",
  });
  return data.cart;
}

export async function syncGuestCartToServer() {
  if (!isAuthorized()) return;

  const guest = getGuestCart();
  if (guest.length === 0) return;

  await updateCart(guest, true);
  clearGuestCart();

  const me = await apiRequest("/auth/me");
  setCurrentUser(me.user);
}

export async function getFullCartDetails() {
  const cartItems = await getCart();
  const productsData = await apiRequest("/products?limit=200&offset=0");
  const map = new Map(productsData.items.map((item) => [item.id, item]));

  // Собираем объединенную структуру для удобного рендера на странице корзины.
  return cartItems
    .map((item) => {
      const product = map.get(item.productId);
      if (!product) return null;
      return {
        ...item,
        product,
      };
    })
    .filter(Boolean);
}

export function getCartCountFromItems(items) {
  return items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
}

export function getCartTotal(details) {
  return details.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
}

export function touchUserCartInLocalState(items) {
  const user = getCurrentUser();
  if (!user) return;
  user.cart = items;
  setCurrentUser(user);
}

