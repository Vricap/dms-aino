/* eslint import/no-named-as-default: 'off' */
import React from "react";
import { Route, IndexRoute } from "react-router";
import App from "./components/App.jsx";
import HomePage from "./components/documents/HomePage.jsx";
import LoginPage from "./components/access/LoginPage.jsx";
import SignUpPage from "./components/access/SignUpPage.jsx";
import DocumentPage from "./components/documents/DocumentPage.jsx";
import ManageDocument from "./components/documents/ManageDocument.jsx";
import ProfilePage from "./components/users/ProfilePage.jsx";
import ManageRoles from "./components/roles/ManageRoles.jsx";
import ManageUsers from "./components/users/ManageUsers.jsx";
import EnsureUserIsAdmin from "./components/access/EnsureUserIsAdmin.jsx";
import EnsureLoggedIn from "./components/access/EnsureLoggedIn.jsx";

export default (
  <Route path="/" component={App}>
    <IndexRoute component={HomePage} />
    <Route path="login" component={LoginPage} />
    <Route path="signup" component={SignUpPage} />

    <Route component={EnsureLoggedIn}>
      <Route path="mydocuments" component={HomePage} />
      <Route path="user/edit" component={SignUpPage} />
      <Route path="profile" component={ProfilePage} />
      <Route path="document/:id" component={ManageDocument} />
    </Route>

    <Route component={EnsureUserIsAdmin}>
      <Route path="user" component={ManageUsers} />
      <Route path="role" component={ManageRoles} />
    </Route>

    <Route path="document" component={ManageDocument} />
    <Route path="/:id" component={DocumentPage} />
    <Route path="*" component={HomePage} />
  </Route>
);
