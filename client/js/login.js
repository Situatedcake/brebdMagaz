import { apiRequest } from "./api.js";
import { loadCurrentUser, renderHeader, setCurrentUser } from "./auth.js";
import { syncGuestCartToServer } from "./cart.js";
import { showMessage } from "./utils.js";

const form = document.getElementById("login-form");
const message = document.getElementById("login-message");

function attachPasswordToggle() {
  document.querySelectorAll("[data-toggle-password]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.togglePassword;
      const input = document.getElementById(targetId);
      if (!input) return;
      const isHidden = input.type === "password";
      input.type = isHidden ? "text" : "password";
      btn.textContent = isHidden ? "Скрыть" : "Показать";
    });
  });
}

async function init() {
  await loadCurrentUser();
  renderHeader();
  attachPasswordToggle();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const email = formData.get("email");
  const password = formData.get("password");

  try {
    const data = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    localStorage.setItem("token", data.token);
    setCurrentUser(data.user);

    await syncGuestCartToServer();

    showMessage(message, "Успешный вход. Перенаправление...");
    setTimeout(() => {
      window.location.href = "/index.html";
    }, 700);
  } catch (error) {
    showMessage(message, error.message, true);
  }
});

init();
