const jsonwebtoken = require("jsonwebtoken");
const AppError = require("../utills/AppError");
const adminModal = require("../models/Admin.model");
const SECRET_KEY = process.env.JWT_ACCESS_SECRET; // changed here

const jwt = {
  assignJwt: (admin) => {
    const payload = {
      _id: admin?._id,
      email: admin?.email,
      role: admin?.role,
      permissions: admin?.permissions,
    };
    const options = {
      expiresIn: "365d",
    };
    return jsonwebtoken.sign(payload, SECRET_KEY, options);
  },

  verifyAdminToken: (role = null) => {
    return async (req, res, next) => {
      console.log("verifying token", req.headers.authorization);
      try {
        let token = req.headers.authorization;
        if (!token) {
          return next(new AppError("Please provide token", 401));
        }

        // Handle Bearer token format
        if (token.startsWith("Bearer ")) {
          token = token.split(" ")[1];
        }

        let decoded;
        try {
          decoded = jsonwebtoken.verify(token, SECRET_KEY);
        } catch (err) {
          if (err.name === "TokenExpiredError") {
            return next(
              new AppError("Session timeout: Please login again", 401)
            );
          }
          console.log(err,"error");
          return next(new AppError("Access Denied: Invalid Token", 401));
        }

        if (!decoded) {
          return next(new AppError("Access Denied: Invalid Token", 401));
        }

        // Fetch admin from database
        const admin = await adminModal.findById(decoded._id);
        if (!admin) {
          return next(new AppError("Admin not found", 401));
        }

        if (admin.isActive !== true) {
          return next(new AppError("Admin deactivated", 403));
        }

        if (role && role !== admin.role) {
          return next(
            new AppError(
              "Access Denied: You do not have permission to access this resource",
              403
            )
          );
        }
        req.admin = admin;
        next();
      } catch (error) {
        console.log(error, "error");
        return next(error);
      }
    };
  },
};

module.exports = jwt;
