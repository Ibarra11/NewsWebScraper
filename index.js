require("dotenv/config");
const cors = require("cors");
const express = require("express");
const fs = require("fs/promises");
const path = require("path");

const app = express();

app.use(cors());
app.get("/api/articles", async (req, res) => {
  const articles = JSON.parse(
    await fs.readFile(path.join(process.cwd(), "public", "articles.json"))
  );
  return res.json({ articles });
});

app.use(express.static("public"));

// creates and starts a server for our API on a defined port
app.listen(process.env.PORT, () => {
  console.log(`Example app listening at http://localhost:${process.env.PORT}`);
});
