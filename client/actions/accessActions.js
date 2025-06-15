import axios from "axios";
// import jwt from "jsonwebtoken";
import { jwtDecode } from "jwt-decode";
import * as types from "./types.js";
import setHeaderToken from "../utilities/setHeaderToken.js";
import { getDocuments } from "./documentActions.js";
import { beginAjaxCall } from "./ajaxStatusActions.js";
import { throwError } from "../utilities/errorHandler.js";

/**
 * Dispatch action to login a user via the client
 *
 * @param {String} token user token
 * @param {String} type action type
 * @returns {Object} dispatch object
 */
export function clientLogin(token, type) {
  setHeaderToken(token);
  const decoded = jwtDecode(token);
  const user = {
    id: decoded.id,
    roleId: decoded.roleId,
    username: decoded.username,
  };

  return {
    type,
    user,
  };
}

/**
 * Dispatch action to login a user
 *
 * @param {Object} userDetails
 * @returns {Object} dispatch object
 */
export function login(userDetails) {
  return (dispatch) => {
    dispatch(beginAjaxCall());

    return axios
      .post("/users/login", userDetails)
      .then((res) => {
        const token = res.data.token;
        localStorage.setItem("jwToken", token);

        dispatch(clientLogin(token, types.LOGIN_SUCCESS));
      })
      .catch((error) => throwError(error, dispatch));
  };
}
/**
 * Dispatch action to register or update a user
 *
 * @param {Object} userDetails
 * @returns {Object} dispatch object
 */
export function saveUser(userDetails) {
  if (userDetails.id) {
    return (dispatch) => {
      dispatch(beginAjaxCall());

      return axios
        .put(`/users/${userDetails.id}`, userDetails)
        .then(() => {
          dispatch({
            type: types.PROFILE_UPDATE_SUCCESS,
          });
        })
        .catch((error) => throwError(error, dispatch));
    };
  }

  return (dispatch) => {
    dispatch(beginAjaxCall());

    return axios
      .post("/users", userDetails)
      .then((res) => {
        const token = res.data.token;

        dispatch(clientLogin(token, types.LOGIN_SUCCESS));
      })
      .catch((error) => throwError(error, dispatch));
  };
}

/**
 * Dispatch action to logout a user
 *
 * @returns {Object} dispatch object
 */
export function logout() {
  return (dispatch) => {
    localStorage.removeItem("jwToken");
    setHeaderToken(null);
    dispatch({ type: types.LOGOUT });
    return dispatch(getDocuments());
  };
}
