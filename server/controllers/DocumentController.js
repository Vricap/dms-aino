import Document from "../models/document.js";
import User from "../models/user.js";
import Authenticator from "../helpers/Authenticator.js";
import handleError from "../helpers/handleError.js";
import paginate from "../helpers/paginate.js";

import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function filterReceiver(id, documents) {
  let doc = documents;
  for (let i = 0; i < doc.length; i++) {
    if (doc[i].receiver.length == 0) contiue;
    let arr = [];
    for (let j = 0; j < doc[i].receiver; j++) {
      if (doc[i].receiver[j].user == id) {
        arr.push({
          user: doc[i].receiver[j].user,
          dateSent: doc[i].receiver[j].dateSent,
          dateSigned: doc[i].receiver[j].dateSigned,
        });
      }
    }
    doc[i].receiver = arr;
  }
  return doc;
}

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
      const status = req.query.status || "";

      const token =
        req.body.token || req.query.token || req.headers["x-access-token"];
      const decoded = Authenticator.verifyToken(token);
      const isAdmin = await Authenticator.isAdmin(decoded.roleId);

      let query = {
        title: { $regex: searchKey, $options: "i" },
      };

      if (status) {
        const statuses = status.split(",").map((s) => s.trim()); // e.g status=saved,sent
        query.status = { $in: statuses };
      }

      if (decoded) {
        if (!isAdmin) query.uploader = decoded.id; // if not admin, only show the document they upload themselve
      } else {
        throw new Error("User is unknown!");
      }

      const total = await Document.countDocuments(query);
      const documents = await Document.find(query)
        .populate("uploader", "username roleId")
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit);

      let removed = 0;
      res.status(200).send({
        rows: documents,
        metaData: paginate(total - removed, limit, offset),
      });
    } catch (error) {
      handleError(error, res);
    }
  },

  async getDocumentsInbox(req, res) {
    try {
      const token =
        req.body.token || req.query.token || req.headers["x-access-token"];
      const decoded = Authenticator.verifyToken(token);

      if (!decoded)
        throw new Error("User is unknown! Please login with valid user.");

      const documents = await Document.find({
        "receiver.user": decoded.id,
        status: "sent",
      });

      // we filter only the doc that have the user as receiver
      const doc = filterReceiver(decoded.id, documents);
      res.status(200).send({
        rows: doc,
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
      if (!req.body.title && !req.body.content)
        return res.status(400).send({ message: "Missing required fields" });
      if (!req.file) return res.status(400).send({ message: "Missing file" });

      // Create filename from user input
      const extension = path.extname(req.file.originalname);
      const type = req.body.type;
      const division = req.body.division;
      const fName = `${Date.now()}_${type}_${division}${extension}`;
      const fPath = path.join(__dirname, "../../uploads/documents/");

      // Save metadata to DB
      const document = new Document({
        title: fName,
        content: req.body.content,
        division: req.body.division,
        type: req.body.type,
        uploader: user._id,
        status: "saved",
      });
      await document.save();

      // Save file from memory buffer
      fs.writeFileSync(fPath + fName, req.file.buffer);

      res.status(201).send({
        id: document._id,
        title: document.title,
        content: document.content,
        access: document.access,
        dateExpired: document.dateExpired,
        uploader: document.uploader,
        createdAt: document.createdAt,
        // User: { username: user.username, roleId: user.roleId },
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
