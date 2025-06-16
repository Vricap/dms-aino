import morgan from "morgan";
import express from "express";
import compression from "compression";
import mongoose from "mongoose";

import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import dotenv from "dotenv";
dotenv.config({ path: path.join(__dirname, "../.env") });

import app from "./app.js";
let port = process.env.PORT || 8000;

app.use(morgan("dev"));

// app.use(express.static("/client"));
// app.use(express.static("/api_docs"));
app.use(compression());

// app.get("/api", (req, res) => {
//   res.sendFile(path.join(__dirname, "../api_docs/index.html"));
// });

// 1. Serve static files *first*
// app.use(express.static(path.resolve(__dirname, "../dist")));

// 2. Then catch-all for React routes
// app.get("*", (req, res) => {
//   res.sendFile(path.resolve(__dirname, "../client/index.html"));
// });

(async () => {
  try {
    const mongoURI = process.env.DATABASE_URL;
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("MongoDB Connection Error:", error);
    process.exit(1);
  }
})();

app.listen(port, () => {
  console.log("Server listening at:", port);
});
