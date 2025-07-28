import jwt from "jsonwebtoken";
import user from "../models/user.js";
import role from "../models/role.js";
import document from "../models/document.js";
import handleError from "../helpers/handleError.js";

const secret = process.env.SECRET || "winter is coming";

const Authenticator = {
  async isAdmin(id) {
    const r = await role.findOne({ _id: id });
    return r.name == "admin";
  },
  /**
   * Generate a token
   *
   * @param {Object} userDetails user details
   * @returns {String} token
   */
  generateToken(userDetails) {
    return jwt.sign(userDetails, secret, {
      expiresIn: 60 * 60 * 24 * 7,
    });
  },

  /**
   * Verify a user
   *
   * @param {Object} req request object
   * @param {Object} res response object
   * @param {Function} next next function
   * @returns {Response} response object
   */
  verifyUser(req, res, next) {
    const token =
      req.body.token || req.query.token || req.headers["x-access-token"];

    if (token) {
      jwt.verify(token, secret, (err, decoded) => {
        if (err) {
          return res.status(403).send({ message: "Authentication failed" });
        }
        res.locals.decoded = decoded;
        return next();
      });
    } else {
      return res.status(403).send({
        message: "No token provided",
      });
    }
  },

  /**
   * Verify user token
   *
   * @param {String} token the token
   * @returns {Object|Boolean} decoded token or false
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, secret);
    } catch (err) {
      return false;
    }
  },
  /**
   * Allow access for an admin only
   *
   * @param {Object} req request object
   * @param {Object} res response object
   * @param {Function} next next function
   * @returns {Response} response object
   */
  async permitAdmin(req, res, next) {
    try {
      const isAdmin = await Authenticator.isAdmin(res.locals.decoded.roleId);
      if (isAdmin) return next();
      return res.status(403).send({ message: "Access denied" });
    } catch (err) {
      handleError(err, res);
    }
  },

  /**
   * Permit an admin or profile owner
   *
   * @param {Object} req request object
   * @param {Object} res response object
   * @param {Function} next next function
   * @returns {Response} response object
   */
  async permitOwnerOrAdmin(req, res, next) {
    try {
      const usr = await user.findById(req.params.id);
      if (!usr) {
        return res.status(404).send({ message: "User not found" });
      }

      const isAdmin = await Authenticator.isAdmin(res.locals.decoded.roleId);
      const isOwner = res.locals.decoded.id === usr.id;

      if (isAdmin || isOwner) {
        res.locals.user = usr;
        return next();
      }

      return res.status(403).send({ message: "Access denied" });
    } catch (error) {
      handleError(error, res);
    }
  },

  /**
   * Allow access for the document author
   *
   * @param {Object} req request object
   * @param {Object} res response object
   * @param {Function} next next function
   * @returns {Response} response object
   */
  permitAuthor(req, res, next) {
    return document
      .findById(req.params.id)
      .then((document) => {
        if (!document) {
          return res.status(404).send({ message: "Document not found" });
        }
        
        if (res.locals.decoded.id !== document.uploader.toString()) {
          return res.status(403).send({ message: "Access denied" });
        }

        res.locals.document = document;
        return next();
      })
      .catch((error) => handleError(error, res));
  },

  /**
   * Return secure user details
   *
   * @param {String} user user details
   * @returns {Object} secure data
   */
  secureUserDetails(user) {
    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      roleId: user.roleId,
      about: user.about,
    };
  },
};

export default Authenticator;
