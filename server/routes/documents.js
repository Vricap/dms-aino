import multer from "multer";
import DocumentController from "../controllers/DocumentController.js";
import Authenticator from "../helpers/Authenticator.js";

// Configure multer
/* BUT WE NEED TO ACCESS THE REQUEST BODY FOR THE DOCU NAMING
const storage = multer.diskStorage({
  destination: path.join(__dirname, "../../uploads/documents/"),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  },
});
*/

// so we use multer.memoryStorage()
const upload = multer({ storage: multer.memoryStorage() }); // this don't save to disk yet

export default (app) => {
  app.get(
    "/documents",
    Authenticator.verifyUser,
    DocumentController.getDocuments,
  );
  // TODO: maybe we could get the same request through /documents endpoint and getDocuments contrller with query parameters.
  // (update) absolutely NOT, inbox have some quirks that it will be more performant if we just create its own enpoint with its own controller
  app.get(
    "/documents/inbox",
    Authenticator.verifyUser,
    DocumentController.getDocumentsInbox,
  );
  // app.get(
  //   "/documents/signed",
  //   Authenticator.verifyUser,
  //   DocumentController.getDocumentsSigned,
  // );
  app.post(
    "/documents",
    upload.single("file"),
    Authenticator.verifyUser,
    DocumentController.create,
  );
  app.get(
    // must be at above of /documents/:id path
    "/documents/dashboard",
    Authenticator.verifyUser,
    DocumentController.getDocumentsDashboard,
  );
  app.get(
    "/documents/:id",
    Authenticator.verifyUser,
    DocumentController.getDocument,
  );
  app.get(
    "/documents/blob/:id",
    Authenticator.verifyUser,
    DocumentController.getDocumentBlob,
  );
  app.get(
    "/documents/audit/:id",
    Authenticator.verifyUser,
    DocumentController.getDocumentAudit,
  );
  app.put(
    "/documents/logs/:id",
    Authenticator.verifyUser,
    DocumentController.updateLogs,
  );
  app.put(
    "/documents/:id",
    Authenticator.verifyUser,
    Authenticator.permitAuthor,
    DocumentController.update,
  );
  app.delete(
    "/documents/:id",
    Authenticator.verifyUser,
    Authenticator.permitAuthor,
    DocumentController.delete,
  );

  app.get("/search/documents", DocumentController.getDocuments);
  app.get(
    "/documents/sign/:id",
    Authenticator.verifyUser,
    DocumentController.signDocument,
  );
};
