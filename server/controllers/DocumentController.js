import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

import Document from "../models/document.js";
import User from "../models/user.js";
import Authenticator from "../helpers/Authenticator.js";
import Counter from "../models/counter.js";
import handleError from "../helpers/handleError.js";
import paginate from "../helpers/paginate.js";

import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const romanMonths = [
  "",
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
];

// function filterReceiver(id, documents) {
//   let doc = documents;
//   for (let i = 0; i < doc.length; i++) {
//     if (doc[i].receiver.length == 0) continue;
//     let arr = [];
//     for (let j = 0; j < doc[i].receiver.length; j++) {
//       if (doc[i].receiver[j].user == id) {
//         arr.push({
//           user: doc[i].receiver[j].user,
//           dateSent: doc[i].receiver[j].dateSent,
//           dateSigned: doc[i].receiver[j].dateSigned,
//         });
//       }
//     }
//     doc[i].receiver = arr;
//   }
//   return doc;
// }

async function getNextCounter(name) {
  const counter = await Counter.findOneAndUpdate(
    { name },
    { $inc: { value: 1 } },
    { new: true, upsert: true },
  );
  return counter.value;
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

  async getDocumentBlob(req, res) {
    try {
      const fPath = path.join(
        __dirname,
        "../../uploads/documents/" + req.params.id,
      );
      if (!fs.existsSync(fPath)) {
        throw new Error("File tidak ditemukan");
      }
      const doc = await Document.findById(req.params.id);
      if (doc && doc.pointer) {
        res.setHeader("Access-Control-Expose-Headers", "X-Meta-Info");
        res.set("X-Meta-Info", JSON.stringify({ message: doc.pointer }));
      }
      res.type("application/pdf");
      res.sendFile(fPath);
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
      // const doc = filterReceiver(decoded.id, documents);
      res.status(200).send({
        rows: documents,
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
      if (!user)
        return res.status(404).send({
          message:
            "User tidak diketahui. Cobalah login dengan user valid atau register.",
        });
      if (!req.body.title && !req.body.content)
        return res
          .status(400)
          .send({ message: "Dokumen title dan konten harus ada!" });
      if (!req.file)
        return res
          .status(400)
          .send({ message: "File tidak ada. Pastikan sudah upload file nya!" });

      // Create filename from user input
      // document naming standart: 001/CHC/BA/I/2024 unisa
      const extension = path.extname(req.file.originalname);
      const type = req.body.type;
      const division = user.division;
      const count = await getNextCounter(division); // create a per-division counter
      const paddedCount = String(count).padStart(3, "0");

      const monthNumber = new Date().getMonth() + 1; // getMonth() is 0-based
      const romanMonth = romanMonths[monthNumber];
      const year = new Date().getFullYear();
      const fName = `${paddedCount}/${division}/${type}/${romanMonth}/${year}${extension}`;
      const fPath = path.join(__dirname, "../../uploads/documents/");

      // Save metadata to DB
      const document = new Document({
        title: fName,
        content: req.body.content,
        division: division,
        type: type,
        uploader: user._id,
        status: "saved",
      });
      await document.save();

      // Save file from memory buffer
      fs.writeFileSync(fPath + document._id, req.file.buffer);

      res.status(201).send({
        id: document._id,
        title: document.title,
        content: document.content,
        access: document.access,
        division: document.division,
        type: document.type,
        dateExpired: document.dateExpired,
        uploader: document.uploader,
        createdAt: document.createdAt,
        message: "Dokumen berhasil di buat.",
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
        return res
          .status(404)
          .send({ message: "Dokumen dengan id itu tidak ditemukan!" });

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
        return res.status(403).send({
          message: "User ini tidak diperbolehkan mengakses dokumen ini!",
        });
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
        return res
          .status(404)
          .send({ message: "Dokumen dengan id ini tidak ditemukan!" });

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
        return res
          .status(404)
          .send({ message: "Dokumen dengan id ini tidak ditemukan!" });

      res.status(200).send({ message: "Dokumen berhasil di hapus!" });
    } catch (error) {
      handleError(error, res);
    }
  },

  async signDocument(req, res) {
    try {
      const doc = await Document.findById(req.params.id);
      if (!doc) {
        return res
          .status(404)
          .send({ message: "Dokumen dengan id ini tidak ditemukan!" });
      }
      const pdfPath = path.join(__dirname, `../../uploads/documents/${doc.id}`); // the pdf file location
      if (!fs.existsSync(pdfPath))
        return res.status(404).send({
          message: "Dokumen dengan id ini tidak ditemukan dalam file system!",
        }); // check if the pdf file exist
      const existingPdfBytes = fs.readFileSync(pdfPath);
      const pdfDoc = await PDFDocument.load(existingPdfBytes);

      const imagePath = path.join(
        __dirname,
        `../../uploads/signature/${res.locals.decoded.id}`,
      ); // the user signature image location
      if (!fs.existsSync(imagePath))
        return res.status(404).send({
          message:
            "Gambar tanda tangan user tidak ditemukan, silahkan upload gambar tanda tanganmu terlebih dahulu di bagian profile!",
        }); // check if the user signature image exist
      const imageBytes = fs.readFileSync(imagePath);
      // Detect image format by magic number
      let image;
      if (imageBytes[0] === 0x89 && imageBytes[1] === 0x50) {
        // PNG
        image = await pdfDoc.embedPng(imageBytes);
      } else if (imageBytes[0] === 0xff && imageBytes[1] === 0xd8) {
        // JPEG
        image = await pdfDoc.embedJpg(imageBytes);
      } else {
        throw new Error(
          "Format gambar tidak didukung. (hanya mendukung PNG atau JPEG)",
        );
      }

      const pages = pdfDoc.getPages();
      // TODO: the signature is sometimes offset from the placeholder. maybe make all the signature image the same size??
      pages[doc.pointer.page - 1].drawImage(image, {
        x: doc.pointer.x,
        y: doc.pointer.y,
        width: doc.pointer.width,
        height: doc.pointer.height,
      });

      const id = doc.receiver.user.toString();
      if (res.locals.decoded.id == id) {
        const pdfBytes = await pdfDoc.save();
        fs.writeFileSync(
          path.join(__dirname, `../../uploads/documents/${doc.id}`),
          pdfBytes,
        );
        doc.receiver.dateSigned = new Date();
        doc.status = "complete";
        doc.pointer.page = undefined;
        doc.pointer.x = undefined;
        doc.pointer.y = undefined;
        doc.pointer.width = undefined;
        doc.pointer.height = undefined;
        await doc.save();
        return res
          .status(200)
          .send({ message: "Dokumen berhasil di tanda tangani!" });
      }

      res
        .status(400)
        .send({ message: "Anda tidak bisa menanda tangani dokumen ini" });
    } catch (err) {
      handleError(err, res);
    }
  },
};

export default DocumentController;
