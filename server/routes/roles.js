import RoleController from "../controllers/RoleController.js";
import Authenticator from "../helpers/Authenticator.js";

export default (app) => {
  app.get("/roles", RoleController.getRoles);
  app.post(
    "/roles",
    Authenticator.verifyUser,
    Authenticator.permitAdmin,
    RoleController.create,
  );

  app.get("/roles/:id", RoleController.getRole);
  app.put(
    "/roles/:id",
    Authenticator.verifyUser,
    Authenticator.permitAdmin,
    RoleController.update,
  );
  app.delete(
    "/roles/:id",
    Authenticator.verifyUser,
    Authenticator.permitAdmin,
    RoleController.delete,
  );
};
