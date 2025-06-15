import { combineReducers } from "redux";
import { documents, document } from "./documentReducer.js";
import access from "./accessReducer.js";
import users from "./userReducer.js";
import roles from "./roleReducer.js";
import pagination from "./paginationReducer.js";
import ajaxCallsInProgress from "./ajaxStatusReducer.js";

const rootReducer = combineReducers({
  documents,
  access,
  users,
  roles,
  document,
  pagination,
  ajaxCallsInProgress,
});

export default rootReducer;
