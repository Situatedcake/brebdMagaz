import { apiRequest } from "./api.js";

const USER_KEY = "currentUser";

export function getCurrentUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

export function setCurrentUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem(USER_KEY);
}

export function isAuthorized() {
  return Boolean(localStorage.getItem("token"));
}

export async function loadCurrentUser() {
  if (!isAuthorized()) {
    return null;
  }

  try {
    const data = await apiRequest("/auth/me");
    setCurrentUser(data.user);
    return data.user;
  } catch (error) {
    clearAuth();
    return null;
  }
}

export async function logout() {
  try {
    await apiRequest("/auth/logout", { method: "POST" });
  } catch (error) {
    // Игнорируем ошибку logout, чтобы не блокировать выход на клиенте.
  }
  clearAuth();
}

export function renderHeader() {
  const header = document.getElementById("site-header");
  if (!header) return;

  const user = getCurrentUser();
  const isAdmin = user && user.isAdmin;

  header.innerHTML = `
    <div class="header-inner">
      <a class="brand" href="/index.html">BrebdMagaz</a>
      <nav class="nav">
        <a href="/index.html">Каталог</a>
        <a href="/cart.html">Корзина</a>
        ${isAdmin ? '<a href="/admin.html">Админка</a>' : ""}
      </nav>
      <div class="user-box">
        ${
          user
            ? `
              <img class="avatar" src="${user.avatar}" alt="avatar" />
              <a class="btn btn-secondary" href="/profile.html">Профиль</a>
              <button id="logout-btn" class="btn">Выйти</button>
            `
            : `
              <a class="btn btn-secondary" href="/login.html">Войти</a>
              <a class="btn" href="/register.html">Зарегистрироваться</a>
            `
        }
      </div>
    </div>
  `;

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await logout();
      window.location.href = "/index.html";
    });
  }
}

