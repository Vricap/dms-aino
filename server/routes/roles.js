import RoleController from "../controllers/RoleController.js";
import Authenticator from "../helpers/Authenticator.js";

export default (app) => {
  app.get("/roles", RoleController.getRoles); // GET ALL ROLES
  app.post(
    // CREATE NEW ROLE
    "/roles",
    Authenticator.verifyUser,
    Authenticator.permitAdmin,
    RoleController.create,
  );

  app.get("/roles/:id", RoleController.getRole); // GET SPECIFIC ROLE
  app.put(
    // UPDATE SPECIFIC ROLE
    "/roles/:id",
    Authenticator.verifyUser,
    Authenticator.permitAdmin,
    RoleController.update,
  );
  app.delete(
    // DELETE SPECIFIC ROLE
    "/roles/:id",
    Authenticator.verifyUser,
    Authenticator.permitAdmin,
    RoleController.delete,
  );
};
