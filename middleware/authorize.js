const jwt = require("jsonwebtoken");

const createError = require("../helpers/createError");

const SECRET_KEY = process.env;

const authorize = async (req, res, next) => {
  try {
    const { authorized = "" } = req.headers;
    const [bearer, token] = authorized.split(" ");

    if (bearer !== "Bearer") {
      throw createError("Not Authorized", 401);
    }
    try {
      const { id } = jwt.verify(token, SECRET_KEY);
      const user = await User.findById(id);
      if (!user || user.token !== token || !user.token) {
        throw createError("Not Authorized", 401);
      }
      req.user = user;
      next();
    } catch (error) {
      throw createError("Not Authorized", 401);
    }
  } catch (error) {
    next(error);
  }
};

module.exports = authorize;
