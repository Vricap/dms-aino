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

app.use(compression());

// app.use(express.static(path.join(__dirname + "/../", "build")));
// app.get("*", (req, res) => {
//   res.sendFile(path.join(__dirname + "/../", "build", "index.html"));
// });

(async () => {
  try {
    const mongoURI = process.env.DATABASE_URL;
    await mongoose.connect(mongoURI);
    console.log("MongoDB Connected");

    // MongoDB does not automatically remove old indexes just because you updated or removed a field in your schema.
    // const indexes = await mongoose.connection.collection("documents").indexes();
    // console.log(indexes);
    // await Document.syncIndexes(); // this drops any indexes not defined in the current schema
  } catch (error) {
    console.error("MongoDB Connection Error:", error);
    process.exit(1);
  }
})();

app.listen(port, () => {
  console.log("Server listening at:", port);
});
