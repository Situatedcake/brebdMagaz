const express = require("express");
const { authRequired } = require("../middleware/auth.middleware");
const { readJson, writeJson } = require("../utils/db");

const router = express.Router();

function mergeCartItems(oldCart, incoming) {
  const next = [...oldCart];
  incoming.forEach((item) => {
    const index = next.findIndex(
      (saved) => saved.productId === item.productId && saved.size === item.size
    );
    if (index === -1) {
      next.push(item);
    } else {
      next[index].quantity += item.quantity;
    }
  });
  return next;
}

function hasSelectableSizes(product) {
  return Array.isArray(product.sizes) && product.sizes.length > 0 && !product.sizes.includes("One Size");
}

router.get("/", authRequired, async (req, res) => {
  res.json({ cart: req.user.cart || [] });
});

router.post("/", authRequired, async (req, res) => {
  try {
    const { productId, quantity = 1, size = "" } = req.body;
    if (!productId) {
      return res.status(400).json({ message: "Не указан товар" });
    }

    const products = await readJson("products.json");
    const product = products.find((item) => item.id === productId);
    if (!product) {
      return res.status(404).json({ message: "Товар не найден" });
    }

    if (hasSelectableSizes(product) && !size) {
      return res.status(400).json({ message: "Выберите размер перед добавлением в корзину" });
    }

    const users = await readJson("users.json");
    const index = users.findIndex((user) => user.id === req.user.id);
    if (index === -1) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    const cart = users[index].cart || [];
    const cartIndex = cart.findIndex(
      (item) => item.productId === productId && item.size === size
    );

    if (cartIndex === -1) {
      cart.push({ productId, quantity: Number(quantity), size });
    } else {
      cart[cartIndex].quantity += Number(quantity);
    }

    users[index].cart = cart;
    await writeJson("users.json", users);
    res.status(201).json({ message: "Товар добавлен в корзину", cart });
  } catch (error) {
    res.status(500).json({ message: "Ошибка добавления в корзину" });
  }
});

router.put("/", authRequired, async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ message: "Передайте массив товаров" });
    }

    const safeItems = items
      .map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity) || 1,
        size: item.size || "",
      }))
      .filter((item) => item.productId && item.quantity > 0);

    const users = await readJson("users.json");
    const index = users.findIndex((user) => user.id === req.user.id);
    if (index === -1) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    const shouldMerge = String(req.query.merge || "") === "true";
    users[index].cart = shouldMerge
      ? mergeCartItems(users[index].cart || [], safeItems)
      : safeItems;

    await writeJson("users.json", users);
    res.json({ message: "Корзина обновлена", cart: users[index].cart });
  } catch (error) {
    res.status(500).json({ message: "Ошибка обновления корзины" });
  }
});

router.delete("/:id", authRequired, async (req, res) => {
  try {
    const productId = req.params.id;
    const size = req.query.size || "";
    const users = await readJson("users.json");
    const index = users.findIndex((user) => user.id === req.user.id);
    if (index === -1) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    users[index].cart = (users[index].cart || []).filter(
      (item) => !(item.productId === productId && item.size === size)
    );
    await writeJson("users.json", users);
    res.json({ message: "Товар удален из корзины", cart: users[index].cart });
  } catch (error) {
    res.status(500).json({ message: "Ошибка удаления из корзины" });
  }
});

module.exports = router;
