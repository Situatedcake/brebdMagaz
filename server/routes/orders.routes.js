const express = require("express");
const { authRequired } = require("../middleware/auth.middleware");
const { readJson, writeJson } = require("../utils/db");

const router = express.Router();

router.get("/my", authRequired, async (req, res) => {
  try {
    const orders = await readJson("orders.json");
    const userOrders = orders
      .filter((order) => order.userId === req.user.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ items: userOrders });
  } catch (error) {
    res.status(500).json({ message: "Ошибка получения заказов" });
  }
});

router.patch("/:id/cancel", authRequired, async (req, res) => {
  try {
    const orderId = req.params.id;
    const orders = await readJson("orders.json");
    const index = orders.findIndex((order) => order.id === orderId);

    if (index === -1) {
      return res.status(404).json({ message: "Заказ не найден" });
    }

    if (orders[index].userId !== req.user.id) {
      return res.status(403).json({ message: "Нельзя отменить чужой заказ" });
    }

    const activeStatuses = ["new", "in_transit"];
    if (!activeStatuses.includes(orders[index].status)) {
      return res.status(400).json({ message: "Этот заказ уже нельзя отменить" });
    }

    orders[index].status = "cancelled";
    await writeJson("orders.json", orders);

    res.json({ message: "Заказ отменен", order: orders[index] });
  } catch (error) {
    res.status(500).json({ message: "Ошибка отмены заказа" });
  }
});

router.post("/", authRequired, async (req, res) => {
  try {
    const { deliveryAddress = "" } = req.body;
    const users = await readJson("users.json");
    const products = await readJson("products.json");
    const orders = await readJson("orders.json");
    const userIndex = users.findIndex((user) => user.id === req.user.id);

    if (userIndex === -1) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    const cart = users[userIndex].cart || [];
    if (cart.length === 0) {
      return res.status(400).json({ message: "Нельзя оформить пустую корзину" });
    }

    if (!deliveryAddress.trim()) {
      return res.status(400).json({ message: "Укажите адрес доставки" });
    }

    const fullItems = cart.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      return {
        productId: item.productId,
        title: product ? product.title : "Удаленный товар",
        price: product ? product.price : 0,
        quantity: item.quantity,
        size: item.size || "",
      };
    });

    const totalPrice = fullItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const order = {
      id: `o_${Date.now()}`,
      userId: users[userIndex].id,
      items: fullItems,
      totalPrice,
      status: "in_transit",
      deliveryAddress: deliveryAddress.trim(),
      createdAt: new Date().toISOString(),
    };

    orders.push(order);
    users[userIndex].cart = [];
    await writeJson("orders.json", orders);
    await writeJson("users.json", users);

    res.status(201).json({ message: "Заказ оформлен", order });
  } catch (error) {
    res.status(500).json({ message: "Ошибка оформления заказа" });
  }
});

module.exports = router;
