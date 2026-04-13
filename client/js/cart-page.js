import { apiRequest } from "./api.js";
import { renderHeader, loadCurrentUser, isAuthorized } from "./auth.js";
import {
  deleteCartItem,
  getCartTotal,
  getFullCartDetails,
  getCart,
  updateCart,
  touchUserCartInLocalState,
} from "./cart.js";
import { formatPrice } from "./utils.js";

const cartList = document.getElementById("cart-list");
const cartSummary = document.getElementById("cart-summary");

function ensureCheckoutModal() {
  if (document.getElementById("checkout-modal")) return;

  const modal = document.createElement("div");
  modal.id = "checkout-modal";
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-card">
      <h3>Оформление заказа</h3>
      <p class="muted">Выберите адрес доставки</p>
      <select id="address-select">
        <option value="">Выберите адрес</option>
        <option value="г. Москва, ул. Тверская, 10">г. Москва, ул. Тверская, 10</option>
        <option value="г. Новосибирск, ул. Ленина, 25">г. Новосибирск, ул. Ленина, 25</option>
        <option value="г. Санкт-Петербург, Невский проспект, 40">г. Санкт-Петербург, Невский проспект, 40</option>
      </select>
      <textarea id="custom-address" placeholder="Или введите свой адрес"></textarea>
      <p id="modal-message" class="message"></p>
      <div class="modal-actions">
        <button id="cancel-checkout" class="btn btn-secondary" type="button">Отмена</button>
        <button id="confirm-checkout" class="btn" type="button">Подтвердить</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      modal.classList.remove("open");
    }
  });

  document.getElementById("cancel-checkout").addEventListener("click", () => {
    modal.classList.remove("open");
  });
}

function openCheckoutModal() {
  ensureCheckoutModal();
  const modal = document.getElementById("checkout-modal");
  const select = document.getElementById("address-select");
  const custom = document.getElementById("custom-address");
  const msg = document.getElementById("modal-message");

  select.value = "";
  custom.value = "";
  msg.textContent = "";
  modal.classList.add("open");
}

function getSelectedAddress() {
  const select = document.getElementById("address-select");
  const custom = document.getElementById("custom-address");
  return custom.value.trim() || select.value.trim();
}

async function changeQty(productId, size, delta) {
  const cart = await getCart();
  const next = cart
    .map((item) => {
      if (item.productId === productId && item.size === size) {
        return { ...item, quantity: item.quantity + delta };
      }
      return item;
    })
    .filter((item) => item.quantity > 0);

  const saved = await updateCart(next);
  touchUserCartInLocalState(saved);
  await renderCart();
}

async function renderCart() {
  const details = await getFullCartDetails();

  if (details.length === 0) {
    cartList.innerHTML = "<p>Корзина пока пустая.</p>";
    cartSummary.innerHTML = "";
    return;
  }

  cartList.innerHTML = details
    .map(
      (item) => `
      <article class="cart-item">
        <img src="${item.product.image}" alt="${item.product.title}" />
        <div>
          <h3>${item.product.title}</h3>
          <p class="muted">${item.product.brand}</p>
          <p>${formatPrice(item.product.price)} ${item.size ? `| Размер: ${item.size}` : ""}</p>
          <div class="qty-row">
            <button class="qty-btn minus-btn" data-id="${item.productId}" data-size="${item.size || ""}">-</button>
            <span>${item.quantity}</span>
            <button class="qty-btn plus-btn" data-id="${item.productId}" data-size="${item.size || ""}">+</button>
          </div>
        </div>
        <div>
          <button class="btn btn-danger del-btn" data-id="${item.productId}" data-size="${item.size || ""}">Удалить</button>
        </div>
      </article>
    `
    )
    .join("");

  const total = getCartTotal(details);
  cartSummary.innerHTML = `
    <p><strong>Итоговая сумма: ${formatPrice(total)}</strong></p>
    <button id="checkout-btn" class="btn">Оформить заказ</button>
    <p id="checkout-message" class="message"></p>
  `;

  cartList.querySelectorAll(".plus-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      await changeQty(button.dataset.id, button.dataset.size, 1);
    });
  });

  cartList.querySelectorAll(".minus-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      await changeQty(button.dataset.id, button.dataset.size, -1);
    });
  });

  cartList.querySelectorAll(".del-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const saved = await deleteCartItem(button.dataset.id, button.dataset.size);
      touchUserCartInLocalState(saved);
      await renderCart();
    });
  });

  const checkoutBtn = document.getElementById("checkout-btn");
  const checkoutMessage = document.getElementById("checkout-message");
  checkoutBtn.addEventListener("click", async () => {
    if (!isAuthorized()) {
      checkoutMessage.style.color = "#b74444";
      checkoutMessage.textContent = "Для оформления заказа нужно авторизоваться.";
      return;
    }

    openCheckoutModal();
  });
}

async function initCheckoutModalConfirm() {
  ensureCheckoutModal();
  const confirmBtn = document.getElementById("confirm-checkout");
  const modal = document.getElementById("checkout-modal");
  const modalMessage = document.getElementById("modal-message");

  confirmBtn.addEventListener("click", async () => {
    const address = getSelectedAddress();
    if (!address) {
      modalMessage.style.color = "#b74444";
      modalMessage.textContent = "Укажите адрес доставки";
      return;
    }

    try {
      await apiRequest("/orders", {
        method: "POST",
        body: JSON.stringify({ deliveryAddress: address }),
      });

      modal.classList.remove("open");
      touchUserCartInLocalState([]);
      await renderCart();

      const checkoutMessage = document.getElementById("checkout-message");
      if (checkoutMessage) {
        checkoutMessage.style.color = "#2e6fa3";
        checkoutMessage.textContent = "Заказ оформлен. Статус: В пути";
      }
    } catch (error) {
      modalMessage.style.color = "#b74444";
      modalMessage.textContent = error.message;
    }
  });
}

async function init() {
  await loadCurrentUser();
  renderHeader();
  await renderCart();
  await initCheckoutModalConfirm();
}

init();
