import { apiRequest, uploadAvatarFile } from "./api.js";
import { loadCurrentUser, renderHeader, setCurrentUser } from "./auth.js";
import { syncGuestCartToServer } from "./cart.js";
import { compressImageFile, showMessage } from "./utils.js";

const form = document.getElementById("register-form");
const message = document.getElementById("register-message");
const avatarInput = document.getElementById("register-avatar-input");
const avatarPreview = document.getElementById("register-avatar-preview");

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

avatarInput.addEventListener("change", () => {
  const file = avatarInput.files[0];
  if (!file) return;
  avatarPreview.src = URL.createObjectURL(file);
});

async function init() {
  await loadCurrentUser();
  renderHeader();
  attachPasswordToggle();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(form);

  try {
    let avatar = "";
    const avatarFile = formData.get("avatarFile");
    if (avatarFile && avatarFile.size > 0) {
      const compressed = await compressImageFile(avatarFile);
      const upload = await uploadAvatarFile(compressed);
      avatar = upload.avatarPath;
    }

    const payload = {
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      avatar,
    };

    await apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const loginResult = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: payload.email, password: payload.password }),
    });

    localStorage.setItem("token", loginResult.token);
    setCurrentUser(loginResult.user);
    await syncGuestCartToServer();

    showMessage(message, "Регистрация завершена, вход выполнен автоматически.");
    setTimeout(() => {
      window.location.href = "/index.html";
    }, 700);
  } catch (error) {
    showMessage(message, error.message, true);
  }
});

init();
