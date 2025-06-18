import fs from "fs";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import Role from "../server/models/role.js";
import User from "../server/models/user.js";
import Document from "../server/models/document.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

mongoose
  .connect(process.env.DATABASE_URL)
  .then(() => console.log("DB connection successful!"));

// READ JSON FILE
const roles = JSON.parse(fs.readFileSync(`${__dirname}/roles.json`, "utf-8"));
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, "utf-8"));
const documents = JSON.parse(
  fs.readFileSync(`${__dirname}/documents.json`, "utf-8"),
);

// IMPORT DATA INTO DB
const importAll = async () => {
  try {
    await Role.create(roles);
    await User.create(users, { validateBeforeSave: false });
    await Document.create(documents);
    console.log("Data successfully loaded!");
  } catch (err) {
    console.log(err);
  }
  process.exit();
};
const importRole = async () => {
  try {
    await Role.create(roles);
    console.log("Data role successfully loaded!");
  } catch (err) {
    console.log(err);
  }
  process.exit();
};
const importUser = async () => {
  try {
    await User.create(users);
    console.log("Data user successfully loaded!");
  } catch (err) {
    console.log(err);
  }
  process.exit();
};
const importDocument = async () => {
  try {
    await Document.create(documents);
    console.log("Data document successfully loaded!");
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

// DELETE DATA FROM DB
const deleteAll = async () => {
  try {
    await Role.deleteMany();
    await User.deleteMany();
    await Document.deleteMany();
    console.log("Data successfully deleted!");
  } catch (err) {
    console.log(err);
  }
  process.exit();
};
const deleteRole = async () => {
  try {
    await Role.deleteMany();
    console.log("Data role successfully deleted!");
  } catch (err) {
    console.log(err);
  }
  process.exit();
};
const deleteUser = async () => {
  try {
    await User.deleteMany();
    console.log("Data user successfully deleted!");
  } catch (err) {
    console.log(err);
  }
  process.exit();
};
const deleteDocument = async () => {
  try {
    await Document.deleteMany();
    console.log("Data document successfully deleted!");
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

if (process.argv[2] === "--seed-all") {
  importAll();
} else if (process.argv[2] === "--seed-role") {
  importRole();
} else if (process.argv[2] === "--seed-user") {
  importUser();
} else if (process.argv[2] === "--seed-document") {
  Document.syncIndexes();
  importDocument();
} else if (process.argv[2] === "--delete-all") {
  deleteAll();
} else if (process.argv[2] === "--delete-role") {
  deleteRole();
} else if (process.argv[2] === "--delete-user") {
  deleteUser();
} else if (process.argv[2] === "--delete-document") {
  deleteDocument();
}
