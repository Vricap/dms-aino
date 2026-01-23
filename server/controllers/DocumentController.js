import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

import Document from "../models/document.js";
import User from "../models/user.js";
import Authenticator from "../helpers/Authenticator.js";
import Counter from "../models/counter.js";
import handleError from "../helpers/handleError.js";
import paginate from "../helpers/paginate.js";

import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { promisify } from "util";
const unlinkAsync = promisify(fs.unlink);
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

function filterRange(doc, filter) {
  if (filter === "daily") {
  } else if (filter === "weekly") {
  } else if (filter === "monthly") {
  }

  return doc;
}

async function getNextCounter(name) {
  const counter = await Counter.findOneAndUpdate(
    { name },
    { $inc: { value: 1 } },
    { new: true, upsert: true },
  );
  return counter.value;
}

function getDocumentsSigned(id, docs) {
  let signed = [];
  for (const obj of docs) {
    for (const r of obj.receiver.data) {
      // check if user is still exist in the database (not deleted)
      if (r.user) {
        if (r.user._id.toString() === id && r.signed) {
          const plain = obj.toObject();
          plain.dateSigned = r.dateSigned;
          signed.push(plain);
        }
      }
    }
  }
  return signed;
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
      const div = req.query.div || "";
      const typ = req.query.typ || "";
      const signed = req.query.signed || "";
      const list = req.query.list || ""; // retarted

      const token =
        req.body.token || req.query.token || req.headers["x-access-token"];
      const decoded = Authenticator.verifyToken(token);
      const isAdmin = await Authenticator.isAdmin(decoded.roleId);

      let query = {
        title: { $regex: searchKey, $options: "i" },
      };

      if (status.length > 0) {
        const statuses = status.split(",").map((s) => s.trim()); // e.g status=saved,sent
        query.status = { $in: statuses };
      }

      if (div.length > 0) {
        const division = div.split(",").map((s) => s.trim());
        query.division = { $in: division };
      }

      if (typ.length > 0) {
        const type = typ.split(",").map((s) => s.trim());
        query.type = { $in: type };
      }

      if (signed !== "true") query.uploader = decoded.id; // because documents that user has signed is could be from document other user upload

      if (decoded) {
        if (isAdmin && list === "true") delete query.uploader; // for "semua dokumen" pages, we actually want all documents regardless who their uploader
      } else {
        throw new Error("User is unknown!");
      }

      const total = await Document.countDocuments(query);
      const documents = await Document.find(query)
        .populate("uploader", "username roleId")
        .populate("receiver.data.user", "username")
        .sort({ createdAt: -1 })
        .skip(offset);
      // .limit(limit);

      let removed = 0;

      if (signed === "true") {
        return res.status(200).send({
          rows: getDocumentsSigned(decoded.id, documents),
          metaData: paginate(total - removed, limit, offset),
        });
      }

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
        return res
          .status(404)
          .send({
            message:
              "File dokumen tidak ditemukan di storage. Kemungkinan sudah hilang. Hapus dokumen ini dan mulai dengan upload dokumen baru.",
          });
      }
      const doc = await Document.findById(req.params.id);

      let receiver = {};
      receiver = doc.receiver.data.find(
        (x) =>
          (doc.receiver.signingMode === "sequential"
            ? x.urutan === doc.receiver.current
            : true) && x.user.toString() === res.locals.decoded.id,
      );
      if (doc) {
        res.setHeader("Access-Control-Expose-Headers", "X-Meta-Info");
        res.set(
          "X-Meta-Info",
          JSON.stringify({
            current: doc.receiver.current,
            receiver: receiver,
            signingMode: doc.receiver.signingMode,
          }),
        );
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
        return res.status(404).send({
          message:
            "User tidak diketahui! Tolong login kembali dengan user yang valid.",
        });

      let query = {};

      const div = req.query.div || "";
      const typ = req.query.typ || "";

      if (div.length > 0) {
        const division = div.split(",").map((s) => s.trim());
        query.division = { $in: division };
      }

      if (typ.length > 0) {
        const type = typ.split(",").map((s) => s.trim());
        query.type = { $in: type };
      }

      const documents = await Document.find({
        status: "sent",
        ...query,
      }).populate("uploader", "username");

      let filteredDoc = [];
      for (const obj of documents) {
        obj.receiver.data.forEach((val) => {
          if (res.locals.decoded.id === val.user.toString()) {
            if (
              obj.receiver.signingMode === "sequential" &&
              val.urutan === obj.receiver.current
            ) {
              const plain = obj.toObject(); // have to do this to add new key
              plain.dateSent = val.dateSent;
              filteredDoc.push(plain);
            } else if (obj.receiver.signingMode === "parallel") {
              const thisUrutanIsSigned = obj.receiver.data.find(
                (el) => el.urutan === val.urutan && el.signed,
              );
              if (!thisUrutanIsSigned) {
                const plain = obj.toObject(); // have to do this to add new key
                plain.dateSent = val.dateSent;
                filteredDoc.push(plain);
              }
            }
          }
        });
      }

      res.status(200).send({
        rows: filteredDoc,
      });
    } catch (error) {
      handleError(error, res);
    }
  },

  async getDocumentAudit(req, res) {
    try {
      const document = await Document.findById(req.params.id)
        .populate("uploader", "username")
        .populate("receiver.data.user", "username")
        .populate("logs.views.user", "username")
        .populate("logs.downloads.user", "username");

      if (!document)
        return res
          .status(404)
          .send({ message: "Dokumen dengan id itu tidak ditemukan!" });

      res.status(200).send(document);
    } catch (error) {
      handleError(error, res);
    }
  },

  async getDocumentsDashboard(req, res) {
    try {
      const period = req.query.period || "";
      const user = await User.findById(res.locals.decoded.id).populate(
        "roleId",
        "name",
      );

      const now = new Date();
      // today
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);

      // week
      const startOfWeek = new Date(now);
      const day = now.getDay() || 7; // make Sunday = 7
      startOfWeek.setDate(now.getDate() - day + 1);
      startOfWeek.setHours(0, 0, 0, 0);

      // month
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      let baseQuery = {};
      if (user.roleId.name === "user") {
        baseQuery.uploader = user._id;
      }

      let range;
      switch (period) {
        case "daily":
          range = { $gte: startOfDay, $lte: now };
          break;
        case "weekly":
          range = { $gte: startOfWeek, $lte: now };
          break;
        case "monthly":
          range = { $gte: startOfMonth, $lte: now };
          break;
        case "all":
          range = { $exists: true }; // hack
          break;
      }

      const uploadedQuery = { ...baseQuery, createdAt: range };
      const savedQuery = {
        ...baseQuery,
        status: "saved",
        createdAt: range,
      };
      const sendedQuery = {
        ...baseQuery,
        status: "sent",
        "receiver.data": {
          $elemMatch: {
            dateSent: range,
          },
        },
      };

      // const inboxQuery = {
      //   // ...baseQuery,
      //   "receiver.data": {
      //     $elemMatch: {
      //       user: user._id,
      //       signed: false,
      //       dateSent: range,
      //     },
      //   },
      // };

      const completeQuery = {
        ...baseQuery,
        status: "complete",
        dateComplete: range,
      };
      const signedQuery = {
        // ...baseQuery,
        "receiver.data": {
          $elemMatch: {
            user: user._id,
            signed: true,
            dateSigned: range,
          },
        },
      };

      const uploaded = await Document.countDocuments(uploadedQuery);
      const saved = await Document.countDocuments(savedQuery);
      const sended = await Document.countDocuments(sendedQuery);
      // const inbox = await Document.countDocuments(inboxQuery);
      const complete = await Document.countDocuments(completeQuery);
      const signed = await Document.countDocuments(signedQuery);

      const documents = await Document.find({
        status: "sent",
        "receiver.data": {
          $elemMatch: {
            dateSent: range,
          },
        },
      }).populate("uploader", "username");

      let count = 0;
      for (const obj of documents) {
        obj.receiver.data.forEach((val) => {
          if (res.locals.decoded.id === val.user.toString()) {
            if (
              obj.receiver.signingMode === "sequential" &&
              val.urutan === obj.receiver.current
            ) {
              count++;
            } else if (obj.receiver.signingMode === "parallel") {
              const thisUrutanIsSigned = obj.receiver.data.find(
                (el) => el.urutan === val.urutan && el.signed,
              );
              if (!thisUrutanIsSigned) {
                count++;
              }
            }
          }
        });
      }

      res.status(200).send({
        data: {
          uploaded,
          saved,
          sended,
          inbox: count,
          complete,
          signed,
        },
      });
    } catch (error) {
      handleError(error, res);
    }
  },

  async updateLogs(req, res) {
    try {
      const document = await Document.findById(req.params.id);
      if (!document)
        return res
          .status(404)
          .send({ message: "Dokumen dengan id itu tidak ditemukan!" });

      const activity = req.query.activity || "";
      if (activity === "view") {
        document.logs.views.push({
          user: res.locals.decoded.id,
          dateView: new Date(),
        });
      } else if (activity === "download") {
        document.logs.downloads.push({
          user: res.locals.decoded.id,
          dateDownload: new Date(),
        });
      }

      await document.save();
      res.status(200).send({ message: "success" });
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
      const division = req.body.division;
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
      const document = await Document.findById(req.params.id);
      if (!document)
        return res
          .status(404)
          .send({ message: "Dokumen dengan id ini tidak ditemukan!" });

      document.receiver.data = req.body.data;
      document.status = "sent";
      document.receiver.signingMode = req.body.signingMode;
      await document.save();
      res.status(200).send({ message: "success" });
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
      const fPath = path.join(
        __dirname,
        "../../uploads/documents/" + req.params.id,
      );

      const document = await Document.findByIdAndDelete(req.params.id);
      if (!document)
        return res
          .status(404)
          .send({ message: "Dokumen dengan id ini tidak ditemukan!" });

      if (!fs.existsSync(fPath)) {
        return res.status(404).send({
          message:
            "Dokumen berhasil dihapus dari database, namun file tidak ditemukan dalam storage!",
        });
      }

      await unlinkAsync(fPath);

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

      if (doc.receiver.current > doc.receiver.data.length) {
        doc.status = "complete";
        await doc.save();
        return res.status(400).send({
          message:
            "Semua tanda tangan sudah di tanda tangani dalam dokumen ini!",
        });
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

      let index = null;
      for (let i = 0; i < doc.receiver.data.length; i++) {
        if (
          (doc.receiver.signingMode === "sequential"
            ? doc.receiver.data[i].urutan === doc.receiver.current
            : true) &&
          doc.receiver.data[i].user.toString() === res.locals.decoded.id
        ) {
          index = i;
          break;
        }
      }

      if (index === null) {
        return res
          .status(400)
          .send({ message: "Anda tidak bisa menanda tangani dokumen ini" }); // TODO: better error message
      }

      const pages = pdfDoc.getPages();
      pages[doc.receiver.data[index].pointer.page - 1].drawImage(image, {
        x: doc.receiver.data[index].pointer.x,
        y: doc.receiver.data[index].pointer.y - 50,
        width: doc.receiver.data[index].pointer.width,
        height: doc.receiver.data[index].pointer.height,
      });

      doc.receiver.data[index].dateSigned = new Date();
      doc.receiver.data[index].signed = true;
      doc.receiver.current++;
      if (
        doc.receiver.current >
        doc.receiver.data[doc.receiver.data.length - 1].urutan
      ) {
        doc.status = "complete";
        doc.dateComplete = new Date();
      }

      const pdfBytes = await pdfDoc.save();
      fs.writeFileSync(
        path.join(__dirname, `../../uploads/documents/${doc.id}`),
        pdfBytes,
      );
      await doc.save();
      res.status(200).send({ message: "Dokumen berhasil di tanda tangani!" });
    } catch (err) {
      handleError(err, res);
    }
  },
};

export default DocumentController;
