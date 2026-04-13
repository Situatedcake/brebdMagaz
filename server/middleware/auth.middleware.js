const { readJson } = require("../utils/db");

async function authRequired(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;

    if (!token) {
      return res.status(401).json({ message: "Требуется авторизация" });
    }

    const users = await readJson("users.json");
    const now = Date.now();
    const user = users.find(
      (item) =>
        item.sessionToken === token &&
        item.sessionExpiresAt &&
        new Date(item.sessionExpiresAt).getTime() > now
    );

    if (!user) {
      return res.status(401).json({ message: "Сессия недействительна" });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({ message: "Ошибка проверки авторизации" });
  }
}

function adminRequired(req, res, next) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ message: "Недостаточно прав" });
  }

  next();
}

module.exports = {
  authRequired,
  adminRequired,
};

