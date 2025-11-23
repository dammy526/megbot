require('dotenv').config();
const express = require("express");
const app = express();
const path = require("path");
const fs = require("fs");

const API_KEY = process.env.API_KEY;  // 讀取 Render 的環境變數

app.use(express.json());

// API 金鑰驗證中介層
app.use((req, res, next) => {
  const clientKey = req.headers["x-api-key"];
  if (!clientKey || clientKey !== API_KEY) {
    return res.status(403).json({ error: "invalid api key" });
  }
  next();
});
