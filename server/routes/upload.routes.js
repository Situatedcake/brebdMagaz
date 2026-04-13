const fs = require("fs");
const path = require("path");
const express = require("express");
const multer = require("multer");

const router = express.Router();

const avatarsFolder = path.join(__dirname, "..", "uploads", "avatars");
const productsFolder = path.join(__dirname, "..", "uploads", "products");

[avatarsFolder, productsFolder].forEach((folder) => {
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }
});

function buildUploader(targetFolder, prefix, maxSize) {
  return multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, targetFolder),
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname || ".jpg");
        cb(null, `${prefix}_${Date.now()}_${Math.round(Math.random() * 1e6)}${ext}`);
      },
    }),
    limits: { fileSize: maxSize },
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.startsWith("image/")) {
        cb(new Error("Можно загружать только изображения"));
        return;
      }
      cb(null, true);
    },
  });
}

const avatarUpload = buildUploader(avatarsFolder, "avatar", 1024 * 1024 * 2);
const productUpload = buildUploader(productsFolder, "product", 1024 * 1024 * 5);

router.post("/avatar", avatarUpload.single("avatar"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Файл не загружен" });
  }

  res.status(201).json({
    message: "Аватар загружен",
    avatarPath: `/uploads/avatars/${req.file.filename}`,
  });
});

router.post("/product-images", productUpload.array("images", 8), (req, res) => {
  const files = req.files || [];
  if (files.length === 0) {
    return res.status(400).json({ message: "Файлы не загружены" });
  }

  const imagePaths = files.map((file) => `/uploads/products/${file.filename}`);
  res.status(201).json({
    message: "Фото товара загружены",
    imagePaths,
  });
});

module.exports = router;
