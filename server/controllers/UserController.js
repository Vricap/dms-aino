import User from "../models/user.js";
import Document from "../models/document.js";
import Authenticator from "../helpers/Authenticator.js";
import handleError from "../helpers/handleError.js";
import paginate from "../helpers/paginate.js";

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
      const users = await User.find(
        query,
        "id username fullName email roleId about",
      )
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
      if (req.body.roleId === "1") {
        return res.status(401).send({ message: "Invalid roleId" });
      }

      const user = new User(req.body);
      await user.save();

      const token = Authenticator.generateToken({
        id: user._id,
        username: user.username,
        roleId: user.roleId,
      });

      const response = Authenticator.secureUserDetails(user);
      response.message = "User created";
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
      if (!user) return res.status(404).send({ message: "User not found" });

      res.status(200).send(Authenticator.secureUserDetails(user));
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
      if (req.body.roleId === "1" && res.locals.decoded.roleId !== 1) {
        return res.status(403).send({
          message: "Only an admin can upgrade a user to an admin role",
        });
      }

      const user = await User.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });

      if (!user) return res.status(404).send({ message: "User not found" });

      res.status(200).send(Authenticator.secureUserDetails(user));
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
      if (res.locals.decoded.id !== req.params.id) {
        return res.status(403).send({ message: "Access denied" });
      }

      const user = await User.findByIdAndDelete(req.params.id);
      if (!user) return res.status(404).send({ message: "User not found" });

      res.status(200).send({ message: "User deleted" });
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
        authorId: req.params.id,
      }).populate("authorId", "username roleId");

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
        return res.status(401).send({ message: "Wrong password or username" });
      }

      const token = Authenticator.generateToken({
        id: user._id,
        username: user.username,
        roleId: user.roleId,
      });

      res.status(200).send({
        token,
        message: "Login successful",
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
};

export default UserController;
