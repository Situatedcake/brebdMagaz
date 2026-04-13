const express = require("express");
const { authRequired, adminRequired } = require("../middleware/auth.middleware");
const { readJson, writeJson } = require("../utils/db");

const router = express.Router();

router.use(authRequired, adminRequired);

function normalizeImages(payload) {
  if (Array.isArray(payload.images) && payload.images.length > 0) {
    return payload.images.filter(Boolean).slice(0, 8);
  }

  if (payload.image) {
    return [payload.image];
  }

  return [];
}

router.get("/products", async (req, res) => {
  try {
    const products = await readJson("products.json");
    res.json({ items: products });
  } catch (error) {
    res.status(500).json({ message: "Ошибка получения списка товаров" });
  }
});

router.post("/products", async (req, res) => {
  try {
    const { title, brand, category, price, oldPrice, description, sizes } = req.body;
    if (!title || !brand || !price) {
      return res.status(400).json({ message: "Не хватает обязательных полей" });
    }

    const products = await readJson("products.json");
    const images = normalizeImages(req.body);

    const newProduct = {
      id: `p_${Date.now()}`,
      title,
      brand,
      category: category || "Одежда",
      price: Number(price),
      oldPrice: oldPrice === null || oldPrice === undefined || oldPrice === "" ? null : Number(oldPrice),
      description: description || "",
      image: images[0] || "/assets/images/placeholders/default.svg",
      images,
      sizes: Array.isArray(sizes) ? sizes : ["S", "M", "L"],
      inStock: true,
      isOnSale: true,
      createdAt: new Date().toISOString(),
    };

    products.push(newProduct);
    await writeJson("products.json", products);
    res.status(201).json({ message: "Товар добавлен", item: newProduct });
  } catch (error) {
    res.status(500).json({ message: "Ошибка добавления товара" });
  }
});

router.put("/products/:id", async (req, res) => {
  try {
    const productId = req.params.id;
    const products = await readJson("products.json");
    const index = products.findIndex((item) => item.id === productId);
    if (index === -1) {
      return res.status(404).json({ message: "Товар не найден" });
    }

    const allowedFields = [
      "title",
      "brand",
      "category",
      "price",
      "oldPrice",
      "description",
      "sizes",
      "inStock",
      "isOnSale",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        products[index][field] = req.body[field];
      }
    });

    if (req.body.price !== undefined) {
      products[index].price = Number(req.body.price);
    }

    if (req.body.oldPrice !== undefined) {
      products[index].oldPrice =
        req.body.oldPrice === null || req.body.oldPrice === "" ? null : Number(req.body.oldPrice);
    }

    const images = normalizeImages(req.body);
    if (images.length > 0) {
      products[index].images = images;
      products[index].image = images[0];
    }

    await writeJson("products.json", products);
    res.json({ message: "Товар обновлен", item: products[index] });
  } catch (error) {
    res.status(500).json({ message: "Ошибка обновления товара" });
  }
});

router.patch("/products/:id/toggle-sale", async (req, res) => {
  try {
    const productId = req.params.id;
    const products = await readJson("products.json");
    const index = products.findIndex((item) => item.id === productId);
    if (index === -1) {
      return res.status(404).json({ message: "Товар не найден" });
    }

    products[index].isOnSale = !products[index].isOnSale;
    await writeJson("products.json", products);
    res.json({ message: "Статус продажи изменен", item: products[index] });
  } catch (error) {
    res.status(500).json({ message: "Ошибка изменения статуса товара" });
  }
});

router.delete("/products/:id", async (req, res) => {
  try {
    const productId = req.params.id;
    const products = await readJson("products.json");
    const exists = products.find((item) => item.id === productId);
    if (!exists) {
      return res.status(404).json({ message: "Товар не найден" });
    }

    const next = products.filter((item) => item.id !== productId);
    await writeJson("products.json", next);
    res.json({ message: "Товар удален" });
  } catch (error) {
    res.status(500).json({ message: "Ошибка удаления товара" });
  }
});

module.exports = router;
