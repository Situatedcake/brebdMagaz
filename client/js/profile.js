import { apiRequest, uploadAvatarFile } from "./api.js";
import { loadCurrentUser, renderHeader, setCurrentUser } from "./auth.js";
import { compressImageFile, formatPrice, showMessage } from "./utils.js";

const card = document.getElementById("profile-card");
const form = document.getElementById("profile-form");
const message = document.getElementById("profile-message");
const avatarInput = document.getElementById("profile-avatar-input");
const avatarPreview = document.getElementById("profile-avatar-preview");
const ordersList = document.getElementById("orders-list");

function renderProfileCard(user) {
  card.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
      <img class="avatar" src="${user.avatar}" alt="avatar" />
      <div>
        <div><strong>${user.name}</strong></div>
        <div class="muted">${user.email}</div>
        <div class="muted">Роль: ${user.isAdmin ? "Администратор" : "Пользователь"}</div>
      </div>
    </div>
  `;
}

function mapStatus(status) {
  if (status === "in_transit") return "В пути";
  if (status === "delivered") return "Доставлен";
  if (status === "cancelled") return "Отменен";
  if (status === "new") return "Новый";
  return status;
}

async function loadOrders() {
  try {
    const data = await apiRequest("/orders/my");
    const orders = data.items || [];

    if (orders.length === 0) {
      ordersList.innerHTML = "<p class=\"muted\">Пока нет оформленных заказов.</p>";
      return;
    }

    ordersList.innerHTML = orders
      .map(
        (order) => `
          <article class="order-card">
            <div class="order-top">
              <strong>${order.id}</strong>
              <span class="order-status">${mapStatus(order.status)}</span>
            </div>
            <p class="muted">Адрес: ${order.deliveryAddress}</p>
            <p class="muted">Дата: ${new Date(order.createdAt).toLocaleString()}</p>
            <p><strong>Сумма: ${formatPrice(order.totalPrice)}</strong></p>
            ${
              ["new", "in_transit"].includes(order.status)
                ? `<div class="order-actions"><button class="btn btn-danger cancel-order-btn" data-id="${order.id}" type="button">Отменить заказ</button></div>`
                : ""
            }
          </article>
        `
      )
      .join("");

    ordersList.querySelectorAll(".cancel-order-btn").forEach((button) => {
      button.addEventListener("click", async () => {
        try {
          await apiRequest(`/orders/${button.dataset.id}/cancel`, { method: "PATCH" });
          await loadOrders();
        } catch (error) {
          ordersList.insertAdjacentHTML(
            "afterbegin",
            `<p class="message" style="color:#b74444;">${error.message}</p>`
          );
        }
      });
    });
  } catch (error) {
    ordersList.innerHTML = `<p class=\"muted\">${error.message}</p>`;
  }
}

avatarInput.addEventListener("change", () => {
  const file = avatarInput.files[0];
  if (!file) return;
  avatarPreview.src = URL.createObjectURL(file);
});

async function init() {
  const user = await loadCurrentUser();
  renderHeader();

  if (!user) {
    window.location.href = "/login.html";
    return;
  }

  renderProfileCard(user);
  form.name.value = user.name;
  avatarPreview.src = user.avatar;
  await loadOrders();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    let avatar = "";
    const avatarFile = form.avatarFile.files[0];
    if (avatarFile) {
      const compressed = await compressImageFile(avatarFile);
      const upload = await uploadAvatarFile(compressed);
      avatar = upload.avatarPath;
    }

    const payload = {
      name: form.name.value.trim(),
    };

    if (avatar) {
      payload.avatar = avatar;
    }

    const data = await apiRequest("/users/profile", {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    setCurrentUser(data.user);
    renderProfileCard(data.user);
    renderHeader();
    avatarPreview.src = data.user.avatar;
    form.avatarFile.value = "";
    showMessage(message, "Профиль обновлен");
  } catch (error) {
    showMessage(message, error.message, true);
  }
});

init();
