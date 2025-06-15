/* eslint no-console: "off", global-require: "off" */
import path from "path";
import morgan from "morgan";
import app from "./app.js";

import express from "express";
import compression from "compression";

import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let port = process.env.PORT || 8000;

app.use(morgan("dev"));

app.use(express.static("/client"));
app.use(express.static("/api_docs"));
app.use(compression());

app.get("/api", (req, res) => {
  res.sendFile(path.join(__dirname, "../api_docs/index.html"));
});

// 1. Serve static files *first*
app.use(express.static(path.resolve(__dirname, "../dist")));

// 2. Then catch-all for React routes
app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "../dist/index.html"));
});

// wildcard * is fucking BROKE.
// app.all("/", (req, res) => {
//   const homepage = path.join(__dirname, "../client/index.html");
//   res.sendFile(homepage);
// });

app.listen(port, () => {
  console.log("Server listening at:", port);
});
