const express = require("express");
const { authRequired } = require("../middleware/auth.middleware");
const { readJson, writeJson } = require("../utils/db");

const router = express.Router();

router.put("/profile", authRequired, async (req, res) => {
  try {
    const { name, avatar } = req.body;
    const users = await readJson("users.json");
    const index = users.findIndex((user) => user.id === req.user.id);

    if (index === -1) {
      return res.status(404).json({ message: "Пользователь не найден" });
    }

    if (name) {
      users[index].name = name;
    }

    if (avatar) {
      users[index].avatar = avatar;
    }

    await writeJson("users.json", users);

    res.json({
      message: "Профиль обновлен",
      user: {
        id: users[index].id,
        name: users[index].name,
        email: users[index].email,
        avatar: users[index].avatar,
        isAdmin: users[index].isAdmin,
        cart: users[index].cart,
        createdAt: users[index].createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Ошибка обновления профиля" });
  }
});

module.exports = router;

