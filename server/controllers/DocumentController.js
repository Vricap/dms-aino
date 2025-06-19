import Document from "../models/document.js";
import User from "../models/user.js";
import Authenticator from "../helpers/Authenticator.js";
import handleError from "../helpers/handleError.js";
import paginate from "../helpers/paginate.js";

const DocumentController = {
  /**
   * Get documents
   * Route: GET: /documents or GET: /documents/?limit=[integer]&offset=[integer]&q=[title]
   */
  async getDocuments(req, res) {
    try {
      const searchKey = req.query.q ? req.query.q : "";
      const offset = Number(req.query.offset) || 0;
      const limit = Number(req.query.limit) || 20;

      const token =
        req.body.token || req.query.token || req.headers["x-access-token"];
      const decoded = Authenticator.verifyToken(token);

      let query = {
        title: { $regex: searchKey, $options: "i" },
      };

      if (decoded) {
        if (!(await Authenticator.isAdmin(decoded.roleId))) {
          query.uploader = decoded.id;
        }
      } else {
        throw new Error("User is unknown!");
      }

      const total = await Document.countDocuments(query);
      const documents = await Document.find(query)
        .populate("uploader", "username roleId")
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit);

      // Filter role-based docs if not admin
      // let filteredDocs = documents;
      let removed = 0;

      // if (decoded && decoded.roleId !== 1) {
      //   filteredDocs = documents.filter((doc) => {
      //     if (
      //       doc.access !== "role" ||
      //       (doc.access === "role" && doc.uploader.roleId === decoded.roleId)
      //     ) {
      //       return true;
      //     }
      //     removed++;
      //     return false;
      //   });
      // }

      res.status(200).send({
        rows: documents,
        metaData: paginate(total - removed, limit, offset),
      });
    } catch (error) {
      handleError(error, res);
    }
  },

  /**
   * Create a document
   * Route: POST: /documents
   */
  async create(req, res) {
    try {
      const user = await User.findById(res.locals.decoded.id);
      if (!user) return res.status(404).send({ message: "User not found" });

      req.body.uploader = user._id;
      const document = new Document(req.body);
      await document.save();

      res.status(201).send({
        id: document._id,
        title: document.title,
        content: document.content,
        access: document.access,
        uploader: document.uploader,
        createdAt: document.createdAt,
        User: { username: user.username, roleId: user.roleId },
        message: "Document created",
      });
    } catch (error) {
      handleError(error, res);
    }
  },

  /**
   * Get a document
   * Route: GET: /documents/:id
   */
  async getDocument(req, res) {
    try {
      const document = await Document.findById(req.params.id).populate(
        "uploader",
        "username roleId",
      );

      if (!document)
        return res.status(404).send({ message: "Document not found" });

      const token =
        req.body.token || req.query.token || req.headers["x-access-token"];
      const decoded = Authenticator.verifyToken(token);

      const userId = decoded?.id;
      const userRoleId = decoded?.roleId;

      const canAccess =
        document.access === "public" ||
        userRoleId === 1 ||
        (document.access === "role" &&
          userRoleId === document.uploader.roleId) ||
        userId === String(document.uploader._id);

      if (!canAccess) {
        return res.status(403).send({ message: "Access denied" });
      }

      res.status(200).send(document);
    } catch (error) {
      handleError(error, res);
    }
  },

  /**
   * Update a document
   * Route: PUT: /documents/:id
   */
  async update(req, res) {
    try {
      const document = await Document.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true },
      ).populate("uploader", "username roleId");

      if (!document)
        return res.status(404).send({ message: "Document not found" });

      res.status(200).send(document);
    } catch (error) {
      handleError(error, res);
    }
  },

  /**
   * Delete a document
   * Route: DELETE: /documents/:id
   */
  async delete(req, res) {
    try {
      const document = await Document.findByIdAndDelete(req.params.id);
      if (!document)
        return res.status(404).send({ message: "Document not found" });

      res.status(200).send({ message: "Document deleted" });
    } catch (error) {
      handleError(error, res);
    }
  },
};

export default DocumentController;
