import roles from "./roles.js";
import users from "./users.js";
import documents from "./documents.js";

export default (app) => {
  roles(app);
  users(app);
  documents(app);
};
