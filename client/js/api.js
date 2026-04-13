const API_PREFIX = "/api";

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_PREFIX}${path}`, {
    ...options,
    headers,
  });

  let data = {};
  try {
    data = await response.json();
  } catch (error) {
    data = {};
  }

  if (!response.ok) {
    const message = data.message || "Ошибка запроса";
    throw new Error(message);
  }

  return data;
}

export async function uploadAvatarFile(file) {
  const token = localStorage.getItem("token");
  const formData = new FormData();
  formData.append("avatar", file);

  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_PREFIX}/upload/avatar`, {
    method: "POST",
    headers,
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Ошибка загрузки аватара");
  }

  return data;
}

export async function uploadProductImages(files) {
  const token = localStorage.getItem("token");
  const formData = new FormData();

  Array.from(files)
    .slice(0, 8)
    .forEach((file) => {
      formData.append("images", file);
    });

  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_PREFIX}/upload/product-images`, {
    method: "POST",
    headers,
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Ошибка загрузки фото товара");
  }

  return data;
}
