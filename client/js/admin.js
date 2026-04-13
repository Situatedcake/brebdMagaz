import { apiRequest, uploadProductImages } from "./api.js";
import { loadCurrentUser, renderHeader } from "./auth.js";
import { compressImageFile, formatPrice, getProductMainImage, showMessage } from "./utils.js";

const form = document.getElementById("admin-product-form");
const message = document.getElementById("admin-message");
const list = document.getElementById("admin-products");
const submitBtn = document.getElementById("admin-submit-btn");
const cancelBtn = document.getElementById("admin-cancel-btn");
const imagesInput = document.getElementById("admin-images-input");
const imagesPreview = document.getElementById("admin-images-preview");

let editingProductId = null;
let editingImages = [];
let cachedProducts = [];

function renderImagePreviews(files) {
  imagesPreview.innerHTML = "";
  Array.from(files)
    .slice(0, 8)
    .forEach((file) => {
      const wrapper = document.createElement("div");
      wrapper.className = "mini-preview-item";
      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      wrapper.appendChild(img);
      imagesPreview.appendChild(wrapper);
    });
}

function renderEditingImages() {
  imagesPreview.innerHTML = "";

  editingImages.forEach((src, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = "mini-preview-item";

    const img = document.createElement("img");
    img.src = src;
    img.alt = "preview";
    wrapper.appendChild(img);

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "mini-remove-btn";
    removeBtn.textContent = "×";
    removeBtn.title = "Удалить фото";
    removeBtn.addEventListener("click", () => {
      editingImages = editingImages.filter((_, i) => i !== index);
      renderEditingImages();
    });
    wrapper.appendChild(removeBtn);

    imagesPreview.appendChild(wrapper);
  });

  // В режиме редактирования дополняем превью выбранными новыми файлами.
  const selectedFiles = Array.from(imagesInput.files || []).slice(0, 8);
  selectedFiles.forEach((file) => {
    const wrapper = document.createElement("div");
    wrapper.className = "mini-preview-item";

    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    img.alt = "new preview";
    wrapper.appendChild(img);

    const badge = document.createElement("span");
    badge.className = "mini-badge";
    badge.textContent = "new";
    wrapper.appendChild(badge);
    imagesPreview.appendChild(wrapper);
  });
}

imagesInput.addEventListener("change", () => {
  const files = Array.from(imagesInput.files).slice(0, 8);
  if (editingProductId) {
    renderEditingImages();
  } else {
    renderImagePreviews(files);
  }
});

function resetEditor() {
  editingProductId = null;
  editingImages = [];
  form.reset();
  imagesPreview.innerHTML = "";
  submitBtn.textContent = "Добавить товар";
  cancelBtn.style.display = "none";
}

cancelBtn.addEventListener("click", () => {
  resetEditor();
  showMessage(message, "Редактирование отменено");
});

function fillFormFromProduct(product) {
  form.title.value = product.title || "";
  form.brand.value = product.brand || "";
  form.category.value = product.category || "";
  form.price.value = Number(product.price || 0);
  form.oldPrice.value = product.oldPrice ?? "";
  form.description.value = product.description || "";
  form.sizes.value = Array.isArray(product.sizes) ? product.sizes.join(", ") : "";

  editingImages = Array.isArray(product.images) && product.images.length > 0 ? product.images : [getProductMainImage(product)];
  imagesInput.value = "";
  renderEditingImages();
}

async function uploadAndCompressProductImages(files) {
  if (!files || files.length === 0) return [];

  const compressedFiles = [];
  for (const file of Array.from(files).slice(0, 8)) {
    const compressed = await compressImageFile(file, 1100, 0.82);
    compressedFiles.push(compressed);
  }

  const upload = await uploadProductImages(compressedFiles);
  return upload.imagePaths || [];
}

async function loadProducts() {
  const data = await apiRequest("/admin/products");
  cachedProducts = data.items;

  list.innerHTML = data.items
    .map(
      (item) => `
      <article class="admin-row">
        <div>
          <strong>${item.title}</strong>
          <div class="muted">${item.brand} | ${item.category}</div>
          <div>${formatPrice(item.price)}</div>
          <div class="muted">Статус: ${item.isOnSale ? "В продаже" : "Снят"}</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;">
          <button class="btn edit-btn" data-id="${item.id}" type="button">Редактировать</button>
          <button class="btn btn-secondary toggle-btn" data-id="${item.id}" type="button">${item.isOnSale ? "Снять" : "Вернуть"}</button>
          <button class="btn btn-danger del-btn" data-id="${item.id}" type="button">Удалить</button>
        </div>
      </article>
    `
    )
    .join("");

  list.querySelectorAll(".toggle-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await apiRequest(`/admin/products/${button.dataset.id}/toggle-sale`, { method: "PATCH" });
        await loadProducts();
      } catch (error) {
        showMessage(message, error.message, true);
      }
    });
  });

  list.querySelectorAll(".del-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await apiRequest(`/admin/products/${button.dataset.id}`, { method: "DELETE" });
        if (editingProductId === button.dataset.id) {
          resetEditor();
        }
        await loadProducts();
      } catch (error) {
        showMessage(message, error.message, true);
      }
    });
  });

  list.querySelectorAll(".edit-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const product = cachedProducts.find((item) => item.id === button.dataset.id);
      if (!product) return;

      editingProductId = product.id;
      fillFormFromProduct(product);
      submitBtn.textContent = "Сохранить изменения";
      cancelBtn.style.display = "inline-flex";
      showMessage(message, "Режим редактирования включен");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const uploadedImages = await uploadAndCompressProductImages(imagesInput.files);
    const finalImages = editingProductId
      ? [...editingImages, ...uploadedImages].slice(0, 8)
      : uploadedImages.slice(0, 8);

    const payload = {
      title: form.title.value.trim(),
      brand: form.brand.value.trim(),
      category: form.category.value.trim(),
      price: Number(form.price.value),
      oldPrice: form.oldPrice.value ? Number(form.oldPrice.value) : null,
      description: form.description.value.trim(),
      sizes: form.sizes.value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      images:
        finalImages.length > 0
          ? finalImages
          : ["/assets/images/placeholders/default.svg"],
    };

    if (editingProductId) {
      await apiRequest(`/admin/products/${editingProductId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      showMessage(message, "Изменения сохранены");
    } else {
      await apiRequest("/admin/products", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      showMessage(message, "Товар добавлен");
    }

    resetEditor();
    await loadProducts();
  } catch (error) {
    showMessage(message, error.message, true);
  }
});

async function init() {
  const user = await loadCurrentUser();
  renderHeader();

  if (!user || !user.isAdmin) {
    window.location.href = "/index.html";
    return;
  }

  try {
    await loadProducts();
  } catch (error) {
    showMessage(message, error.message, true);
  }
}

init();
