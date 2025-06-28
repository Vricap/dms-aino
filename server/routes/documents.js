import DocumentController from "../controllers/DocumentController.js";
import Authenticator from "../helpers/Authenticator.js";

export default (app) => {
  app.get(
    "/documents",
    Authenticator.verifyUser,
    DocumentController.getDocuments,
  );
  app.post("/documents", Authenticator.verifyUser, DocumentController.create);

  app.get(
    "/documents/:id",
    Authenticator.verifyUser,
    DocumentController.getDocument,
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
};
