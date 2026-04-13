import { apiRequest } from "./api.js";
import { renderHeader, loadCurrentUser } from "./auth.js";
import { addToCart } from "./cart.js";
import { formatPrice, getProductImages, getProductMainImage } from "./utils.js";

const grid = document.getElementById("products-grid");
const sentinel = document.getElementById("scroll-sentinel");
const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");

let allProducts = [];
let filteredProducts = [];
let shownCount = 0;
const batchSize = 8;
let observer;

function renderSizeRadios(productId, sizes) {
  if (!sizes || sizes.length === 0) {
    return '<div class="size-warning"></div>';
  }

  return `
    <div class="size-group" data-role="size-group">
      ${sizes
        .map(
          (size, index) => `
            <label class="size-radio">
              <input type="radio" name="size-${productId}" value="${size}" ${index === -1 ? "checked" : ""} />
              <span>${size}</span>
            </label>
          `,
        )
        .join("")}
    </div>
    <div class="size-warning" data-role="size-warning"></div>
  `;
}

function cardTemplate(item) {
  const images = getProductImages(item);
  const hasMultiple = images.length > 1;
  const sizes = Array.isArray(item.sizes) ? item.sizes : [];

  return `
    <article class="product-card" data-id="${item.id}">
      <div class="card-image-wrap">
        <img class="card-image" data-idx="0" src="${getProductMainImage(item)}" alt="${item.title}" />
        ${
          hasMultiple
            ? `
              <button class="carousel-btn left" data-action="prev" type="button">‹</button>
              <button class="carousel-btn right" data-action="next" type="button">›</button>
            `
            : ""
        }
      </div>
      <div class="product-title">${item.title}</div>
      <div class="muted">${item.brand}</div>
      <div class="price-row">
        <strong>${formatPrice(item.price)}</strong>
        ${item.oldPrice ? `<span class="old-price">${formatPrice(item.oldPrice)}</span>` : ""}
      </div>
      ${renderSizeRadios(item.id, sizes)}
      <div class="card-actions">
        <a class="btn btn-secondary" href="/product.html?id=${item.id}">Открыть</a>
        <button class="btn" data-action="add" type="button">В корзину</button>
      </div>
    </article>
  `;
}

function renderVisibleProducts(reset = false) {
  const list = filteredProducts.slice(0, shownCount);
  const html = list.map(cardTemplate).join("");
  if (reset) {
    grid.innerHTML = html;
  } else {
    grid.innerHTML = html;
  }
}

function applyHotSearch() {
  const text = searchInput.value.trim().toLowerCase();

  if (!text) {
    filteredProducts = [...allProducts];
    shownCount = Math.max(
      batchSize,
      Math.min(shownCount || batchSize, filteredProducts.length),
    );
  } else {
    filteredProducts = allProducts.filter((product) => {
      const searchBag =
        `${product.title} ${product.brand} ${product.category}`.toLowerCase();
      return searchBag.includes(text);
    });
    shownCount = filteredProducts.length;
  }

  renderVisibleProducts(true);
}

function rotateCardImage(card, step) {
  const id = card.dataset.id;
  const product = allProducts.find((item) => item.id === id);
  if (!product) return;

  const images = getProductImages(product);
  if (images.length < 2) return;

  const imageEl = card.querySelector(".card-image");
  const currentIdx = Number(imageEl.dataset.idx || 0);
  const nextIdx = (currentIdx + step + images.length) % images.length;

  imageEl.dataset.idx = String(nextIdx);
  imageEl.src = images[nextIdx];
}

async function handleAddToCart(card) {
  const productId = card.dataset.id;
  const product = allProducts.find((item) => item.id === productId);
  if (!product) return;

  const warning = card.querySelector('[data-role="size-warning"]');
  let size = "";

  if (Array.isArray(product.sizes) && product.sizes.length > 0) {
    const checked = card.querySelector(
      `input[name="size-${productId}"]:checked`,
    );
    size = checked ? checked.value : "";

    if (!size) {
      if (warning) warning.textContent = "Сначала выберите размер";
      return;
    }
  }

  await addToCart(productId, size, 1);
  if (warning) warning.textContent = "";

  const button = card.querySelector('[data-action="add"]');
  button.textContent = "Добавлено";
  setTimeout(() => {
    button.textContent = "В корзину";
  }, 900);
}

function attachEvents() {
  grid.addEventListener("click", async (event) => {
    const target = event.target;
    const card = target.closest(".product-card");
    if (!card) return;

    const action = target.dataset.action;
    if (action === "prev") rotateCardImage(card, -1);
    if (action === "next") rotateCardImage(card, 1);
    if (action === "add") await handleAddToCart(card);
  });

  grid.addEventListener("change", (event) => {
    const input = event.target;
    if (!input.matches('.size-radio input[type="radio"]')) return;

    const card = input.closest(".product-card");
    const warning = card
      ? card.querySelector('[data-role="size-warning"]')
      : null;
    if (warning) warning.textContent = "";
  });

  searchInput.addEventListener("input", applyHotSearch);
  searchBtn.addEventListener("click", applyHotSearch);
}

function attachProceduralLoader() {
  if (!sentinel) return;
  observer = new IntersectionObserver(
    (entries) => {
      const isTypingSearch = searchInput.value.trim().length > 0;
      if (isTypingSearch) return;

      const entry = entries[0];
      if (entry.isIntersecting && shownCount < filteredProducts.length) {
        shownCount = Math.min(shownCount + batchSize, filteredProducts.length);
        renderVisibleProducts(true);
      }
    },
    { rootMargin: "260px 0px" },
  );

  observer.observe(sentinel);
}

async function loadAllProducts() {
  let offset = 0;
  const limit = 100;
  let hasMore = true;
  const result = [];

  while (hasMore) {
    const data = await apiRequest(`/products?limit=${limit}&offset=${offset}`);
    result.push(...data.items);
    hasMore = data.hasMore;
    offset += data.items.length;
    if (data.items.length === 0) {
      hasMore = false;
    }
  }

  allProducts = result;
  filteredProducts = [...allProducts];
  shownCount = Math.min(batchSize, filteredProducts.length);
  renderVisibleProducts(true);
}

async function init() {
  await loadCurrentUser();
  renderHeader();
  await loadAllProducts();
  attachEvents();
  attachProceduralLoader();
}

init();
