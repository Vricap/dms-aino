// import "babel-polyfill";
import React from "react";
// import { render } from "react-dom";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { Router, browserHistory } from "react-router";
import { getDocuments } from "./actions/documentActions.js";
import { getRoles } from "./actions/roleActions.js";
import { clientLogin } from "./actions/accessActions.js";
import { CLIENT_LOGIN } from "./actions/types.js";
import configureStore from "./store/configureStore.js";
import routes from "./routes.js";
import "./scss/style.scss";

const store = configureStore();
const token = localStorage.getItem("jwToken");
if (token) {
  store.dispatch(clientLogin(token, CLIENT_LOGIN));
}
store.dispatch(getDocuments());
store.dispatch(getRoles());

const container = document.getElementById("app");
const root = createRoot(container);

root.render(
  <Provider store={store}>
    <Router history={browserHistory} routes={routes} />
  </Provider>,
);
