const express = require("express");
const { readJson, writeJson } = require("../utils/db");
const { hashPassword, createToken } = require("../utils/security");
const { authRequired } = require("../middleware/auth.middleware");

const router = express.Router();

function getPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    isAdmin: user.isAdmin,
    cart: user.cart || [],
    createdAt: user.createdAt,
  };
}

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, avatar } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Заполните все обязательные поля" });
    }

    const users = await readJson("users.json");
    const exists = users.find((user) => user.email.toLowerCase() === email.toLowerCase());

    if (exists) {
      return res.status(409).json({ message: "Пользователь уже существует" });
    }

    const newUser = {
      id: `u_${Date.now()}`,
      name,
      email: email.toLowerCase(),
      password: hashPassword(password),
      avatar:
        avatar ||
        "https://images.unsplash.com/photo-1542909168-82c3e7fdca5c?auto=format&fit=crop&w=200&q=80",
      isAdmin: false,
      cart: [],
      createdAt: new Date().toISOString(),
      sessionToken: null,
      sessionExpiresAt: null,
    };

    users.push(newUser);
    await writeJson("users.json", users);

    res.status(201).json({
      message: "Регистрация прошла успешно",
      user: getPublicUser(newUser),
    });
  } catch (error) {
    res.status(500).json({ message: "Ошибка регистрации" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Укажите email и пароль" });
    }

    const users = await readJson("users.json");
    const index = users.findIndex((user) => user.email === email.toLowerCase());

    if (index === -1) {
      return res.status(401).json({ message: "Неверный логин или пароль" });
    }

    const user = users[index];
    if (user.password !== hashPassword(password)) {
      return res.status(401).json({ message: "Неверный логин или пароль" });
    }

    const token = createToken();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString();
    users[index].sessionToken = token;
    users[index].sessionExpiresAt = expiresAt;
    await writeJson("users.json", users);

    res.json({
      message: "Вход выполнен",
      token,
      user: getPublicUser(users[index]),
    });
  } catch (error) {
    res.status(500).json({ message: "Ошибка авторизации" });
  }
});

router.get("/me", authRequired, async (req, res) => {
  res.json({ user: getPublicUser(req.user) });
});

router.post("/logout", authRequired, async (req, res) => {
  try {
    const users = await readJson("users.json");
    const index = users.findIndex((user) => user.id === req.user.id);
    if (index !== -1) {
      users[index].sessionToken = null;
      users[index].sessionExpiresAt = null;
      await writeJson("users.json", users);
    }
    res.json({ message: "Выход выполнен" });
  } catch (error) {
    res.status(500).json({ message: "Ошибка выхода" });
  }
});

module.exports = router;

