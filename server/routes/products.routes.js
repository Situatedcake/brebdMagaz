const express = require("express");
const { readJson } = require("../utils/db");

const router = express.Router();

function normalizeProduct(item) {
  const images = Array.isArray(item.images) && item.images.length > 0 ? item.images.slice(0, 8) : item.image ? [item.image] : [];
  return {
    ...item,
    images,
    image: images[0] || "/assets/images/placeholders/default.svg",
  };
}

router.get("/", async (req, res) => {
  try {
    const { q = "", limit = "8", offset = "0" } = req.query;
    const products = (await readJson("products.json")).map(normalizeProduct);

    const text = String(q).toLowerCase().trim();
    const filtered = products.filter((product) => {
      if (!text) {
        return true;
      }

      const bag = `${product.title} ${product.brand} ${product.category}`.toLowerCase();
      return bag.includes(text);
    });

    const numLimit = Number(limit);
    const numOffset = Number(offset);
    const list = filtered.slice(numOffset, numOffset + numLimit);

    res.json({
      items: list,
      total: filtered.length,
      hasMore: numOffset + numLimit < filtered.length,
    });
  } catch (error) {
    res.status(500).json({ message: "Ошибка получения товаров" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const products = (await readJson("products.json")).map(normalizeProduct);
    const product = products.find((item) => item.id === req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Товар не найден" });
    }

    res.json({ item: product });
  } catch (error) {
    res.status(500).json({ message: "Ошибка получения товара" });
  }
});

module.exports = router;
