import User from "../models/user.js";
import Role from "../models/role.js";
import Document from "../models/document.js";
import Authenticator from "../helpers/Authenticator.js";
import handleError from "../helpers/handleError.js";
import paginate from "../helpers/paginate.js";

import path from "path";
import sharp from "sharp";
import fs from "fs";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const standardizeImage = async (buffer) => {
  const width = 400;
  const height = 200;
  return sharp(buffer)
    .resize(width, height, {
      fit: "cover",
      // position: "center",
    })
    .toBuffer();
};
const UserController = {
  /**
   * Get users
   * Route: GET: /users or GET: /users/?limit=[integer]&offset=[integer]&q=[username]
   */
  async getUsers(req, res) {
    try {
      const searchKey = req.query.q || "";
      const offset = Number(req.query.offset) || 0;
      const limit = Number(req.query.limit) || 20;

      const query = {
        username: { $regex: searchKey, $options: "i" },
      };

      const total = await User.countDocuments(query);
      const users = await User.find(query, "id username email roleId division").
      	populate("roleId", "name")
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit);
        
      const response = {
        rows: users,
        metaData: paginate(total, limit, offset),
      };

      res.status(200).send(response);
    } catch (error) {
      handleError(error, res);
    }
  },

  /**
   * Create a user
   * Route: POST: /users
   */
  async create(req, res) {
    try {
      // if (req.body.role === "admin") {
      //   return res
      //     .status(401)
      //     .send({ message: "Hanya admin yang bisa membuat user baru!" });
      // }

      const user = new User(req.body);
      const role = await Role.findOne({ name: req.body.role });
      user.roleId = role.id;
      delete user.role;
      await user.save();

      const token = Authenticator.generateToken({
        id: user._id,
        username: user.username,
        roleId: user.roleId,
      });

      const response = Authenticator.secureUserDetails(user);
      response.message = "User berhasil di buat!";
      response.token = token;

      res.status(201).send(response);
    } catch (error) {
      handleError(error, res);
    }
  },

  /**
   * Get a user
   * Route: GET: /users/:id
   */
  async getUser(req, res) {
    try {
      const user = await User.findById(req.params.id);
      if (!user)
        return res.status(404).send({ message: "User tidak ditemukan!" });

      res.status(200).send(await Authenticator.secureUserDetails(user));
    } catch (error) {
      handleError(error, res);
    }
  },

  /**
   * Update a user
   * Route: PUT: /users/:id
   */
  async update(req, res) {
    try {
      // if (req.body.roleId === "1" && res.locals.decoded.roleId !== 1) {
      //   return res.status(403).send({
      //     message:
      //       "Hanya role Admin yang dapat meng-upgrade seorang user ke Admin!",
      //   });
      // }

      const user = await User.findById(req.params.id);
      const userData = req.body.data;
      if (!user)
        return res.status(404).send({ message: "User tidak ditemukan!" });

      if (userData.username) {
        user.username = userData.username;
      } 

      if (userData.email) {
        user.email = userData.email;
      } 

      if (userData.role) {
      	const role = await Role.findOne({ name: userData.role });
        user.roleId = role._id;
      } 

      if (userData.division) {
        user.division = userData.division;
      }

      if (userData.newPassword) {
        user.password = userData.newPassword;
      }

      await user.save();

      res.status(200).send(await Authenticator.secureUserDetails(user));
    } catch (error) {
      handleError(error, res);
    }
  },

  /**
   * Delete a user
   * Route: DELETE: /users/:id
   */
  async delete(req, res) {
    try {
      // if (res.locals.decoded.id !== req.params.id) {
      //   return res.status(403).send({ message: "Akses ditolak!" });
      // }

      const user = await User.findByIdAndDelete(req.params.id);
      if (!user)
        return res.status(404).send({ message: "User tidak ditemukan!" });

      res.status(200).send({ message: "User berhasil di hapus!" });
    } catch (error) {
      handleError(error, res);
    }
  },

  /**
   * Get a user's documents
   * Route: GET: /users/:id/documents
   */
  async getUserDocuments(req, res) {
    try {
      const documents = await Document.find({
        uploader: req.params.id,
      }).populate("uploader", "username roleId");

      res.status(200).send(documents);
    } catch (error) {
      handleError(error, res);
    }
  },

  /**
   * Login a user
   * Route: POST: /users/login
   */
  async login(req, res) {
    try {
      const user = await User.findOne({ username: req.body.username });
      if (!user || !(await user.verifyPassword(req.body.password))) {
        return res.status(401).send({
          message: "Username atau password salah! Silahkan coba lagi.",
        });
      }
      const role = await Role.findById(user.roleId);

      const token = Authenticator.generateToken({
        id: user._id,
        username: user.username,
        roleId: user.roleId,
      });

      const userObj = user.toObject(); // convert mongoose doc to plain js object so that we could manipulate the data
      delete userObj.password;
      userObj.role = role.name;
      res.status(200).send({
        token,
        user: userObj,
        message: "Login berhasil!",
      });
    } catch (error) {
      handleError(error, res);
    }
  },

  /**
   * Logout a user
   * Route: POST: /users/login
   */
  logout(req, res) {
    res.status(200).send({
      message: "Success, delete user token on the client",
    });
  },

  async getSignature(req, res) {
    try {
      const imagePath = path.join(
        __dirname,
        `../../uploads/signature/${req.params.id}`,
      );
      if (!fs.existsSync(imagePath))
        return res.status(404).send({
          message: "Gambar signature tidak ditemukan dalam file system!",
        });

      res.sendFile(imagePath);
    } catch (error) {
      handleError(error, res);
    }
  },

  async createSignature(req, res) {
    try {
      const user = await User.findById(res.locals.decoded.id);
      if (!user)
        return res.status(404).send({ message: "User tidak ditemukan!" });
      if (!req.file) {
        return res.status(400).send({
          message:
            "File gambar tanda tangan hilang. Pastikan sudah mengupload gambar dengan benar!",
        });
      }

      // const extension = path.extname(req.signature.originalname);
      const fPath = path.join(__dirname, "../../uploads/signature/");
      // Resize (standardize) in memory
      const standardizedBuffer = await standardizeImage(req.file.buffer);
      fs.writeFileSync(fPath + user._id, standardizedBuffer);

      res.status(201).send({ message: "Tanda tangan berhasil di buat!" });
    } catch (error) {
      handleError(error, res);
    }
  },
};

export default UserController;
