import multer from "multer";
import UserController from "../controllers/UserController.js";
import Authenticator from "../helpers/Authenticator.js";

const upload = multer({ storage: multer.memoryStorage() }); // this don't save to disk yet

export default (app) => {
  app.post("/users", UserController.create);
  app.get(
    "/users",
    Authenticator.verifyUser,
    // Authenticator.permitAdmin,
    UserController.getUsers,
  );

  app.get("/users/:id", Authenticator.verifyUser, UserController.getUser);
  app.put(
    "/users/:id",
    Authenticator.verifyUser,
    Authenticator.permitOwnerOrAdmin,
    UserController.update,
  );
  app.delete(
    "/users/:id",
    Authenticator.verifyUser,
    Authenticator.permitOwnerOrAdmin,
    UserController.delete,
  );

  app.post("/users/login", UserController.login);
  app.post("/users/logout", UserController.logout);

  app.get(
    "/users/:id/documents",
    Authenticator.verifyUser,
    Authenticator.permitOwnerOrAdmin,
    UserController.getUserDocuments,
  );
  app.get(
    "/search/users",
    Authenticator.verifyUser,
    Authenticator.permitAdmin,
    UserController.getUsers,
  );

  app.post(
    "/signature",
    Authenticator.verifyUser,
    upload.single("signature"),
    UserController.createSignature,
  );
  // app.get("/signature/:id", UserController.getSignature);
  // app.put("/signature/:id", UserController.updateSignature);
  // app.delete("/signature/:id", UserController.deleteSignature);
};
