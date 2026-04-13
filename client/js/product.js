import { apiRequest } from "./api.js";
import { renderHeader, loadCurrentUser } from "./auth.js";
import { addToCart } from "./cart.js";
import { formatPrice, getQueryParam, getProductImages } from "./utils.js";

const productView = document.getElementById("product-view");

function renderProductSizeRadios(itemId, sizes) {
  if (!sizes || sizes.length === 0) {
    return "";
  }

  return `
    <div>
      <p><strong>Размер</strong></p>
      <div class="size-group">
        ${sizes
          .map(
            (size) => `
              <label class="size-radio">
                <input type="radio" name="product-size-${itemId}" value="${size}" />
                <span>${size}</span>
              </label>
            `,
          )
          .join("")}
      </div>
      <div id="product-size-warning" class="size-warning"></div>
    </div>
  `;
}

function renderProduct(item) {
  const images = getProductImages(item);
  const safeImages = images.length ? images : [""];
  const sizes = Array.isArray(item.sizes) ? item.sizes : [];

  productView.innerHTML = `
    <div class="back-btn-row">
      <button id="back-btn" class="btn btn-secondary" type="button">Назад</button>
    </div>

    <div class="product-layout" data-product-id="${item.id}">
      <div>
        <div class="card-image-wrap">
          <img id="product-main-image" class="product-main-image" src="${safeImages[0]}" alt="${item.title}" data-idx="0" />
          ${
            safeImages.length > 1
              ? `
                <button id="product-prev" class="carousel-btn left" type="button">‹</button>
                <button id="product-next" class="carousel-btn right" type="button">›</button>
              `
              : ""
          }
        </div>
        <div class="gallery-strip">
          ${safeImages
            .map(
              (src, idx) =>
                `<img class="gallery-thumb ${idx === 0 ? "active" : ""}" src="${src}" data-idx="${idx}" alt="thumb" />`,
            )
            .join("")}
        </div>
      </div>

      <div>
        <h1>${item.title}</h1>
        <p class="muted">${item.brand}</p>
        <div class="price-row">
          <strong>${formatPrice(item.price)}</strong>
          ${item.oldPrice ? `<span class="old-price">${formatPrice(item.oldPrice)}</span>` : ""}
        </div>
        <p>${item.description || "Описание не указано"}</p>
        <p><strong>Статус:</strong> ${item.isOnSale ? "В продаже" : "Снят с продажи"}</p>

        ${renderProductSizeRadios(item.id, sizes)}

        <div class="card-actions" style="margin-top:16px;">
          <button id="add-product-btn" class="btn" type="button">Добавить в корзину</button>
          <a class="btn btn-secondary" href="/cart.html">Перейти в корзину</a>
        </div>
      </div>
    </div>
  `;

  const backBtn = document.getElementById("back-btn");
  backBtn.addEventListener("click", () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "/index.html";
    }
  });

  const mainImage = document.getElementById("product-main-image");
  const thumbs = Array.from(productView.querySelectorAll(".gallery-thumb"));

  function setCurrentImage(index) {
    const bounded = Math.max(0, Math.min(index, safeImages.length - 1));
    mainImage.dataset.idx = String(bounded);
    mainImage.src = safeImages[bounded];
    thumbs.forEach((thumb, idx) => {
      thumb.classList.toggle("active", idx === bounded);
    });
  }

  thumbs.forEach((thumb) => {
    thumb.addEventListener("click", () => {
      setCurrentImage(Number(thumb.dataset.idx || 0));
    });
  });

  const prevBtn = document.getElementById("product-prev");
  const nextBtn = document.getElementById("product-next");

  if (prevBtn && nextBtn) {
    prevBtn.addEventListener("click", () => {
      const current = Number(mainImage.dataset.idx || 0);
      const nextIndex = (current - 1 + safeImages.length) % safeImages.length;
      setCurrentImage(nextIndex);
    });

    nextBtn.addEventListener("click", () => {
      const current = Number(mainImage.dataset.idx || 0);
      const nextIndex = (current + 1) % safeImages.length;
      setCurrentImage(nextIndex);
    });
  }

  const addBtn = document.getElementById("add-product-btn");
  const warning = document.getElementById("product-size-warning");

  productView.addEventListener("change", (event) => {
    if (event.target.matches(`input[name=\"product-size-${item.id}\"]`)) {
      if (warning) warning.textContent = "";
    }
  });

  addBtn.addEventListener("click", async () => {
    let size = "";
    if (sizes.length > 0) {
      const checked = productView.querySelector(
        `input[name="product-size-${item.id}"]:checked`,
      );
      size = checked ? checked.value : "";
      if (!size) {
        if (warning) warning.textContent = "Сначала выберите размер";
        return;
      }
    }

    await addToCart(item.id, size, 1);
    if (warning) warning.textContent = "";
    addBtn.textContent = "Добавлено";
    setTimeout(() => {
      addBtn.textContent = "Добавить в корзину";
    }, 900);
  });
}

async function init() {
  await loadCurrentUser();
  renderHeader();

  const productId = getQueryParam("id");
  if (!productId) {
    productView.innerHTML = "<p>Не найден параметр id в адресной строке.</p>";
    return;
  }

  try {
    const data = await apiRequest(`/products/${productId}`);
    renderProduct(data.item);
  } catch (error) {
    productView.innerHTML = `<p>${error.message}</p>`;
  }
}

init();
