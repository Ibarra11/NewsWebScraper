require("dotenv/config");
const cors = require("cors");
const express = require("express");

const app = express();

app.use(cors());

app.use(express.static("public"));

// Fallback Middleware function for returning

// creates and starts a server for our API on a defined port
app.listen(process.env.PORT, () => {
  console.log(`Example app listening at http://localhost:${process.env.PORT}`);
});
