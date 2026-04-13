const fs = require("fs/promises");
const path = require("path");

const dbFolder = path.join(__dirname, "..", "..", "db");

async function readJson(fileName) {
  const fullPath = path.join(dbFolder, fileName);
  const raw = await fs.readFile(fullPath, "utf-8");
  return JSON.parse(raw);
}

async function writeJson(fileName, data) {
  const fullPath = path.join(dbFolder, fileName);
  await fs.writeFile(fullPath, JSON.stringify(data, null, 2), "utf-8");
}

module.exports = {
  readJson,
  writeJson,
};

