// middlewares/errorHandler.js
const AppError = require("../utills/AppError");

const notFoundHandler = (req, res, next) => {
  next(new AppError(`Not Found - ${req.originalUrl}`, 404, true));
};

const errorHandler = (err, req, res, next) => {
  const isProd = process.env.NODE_ENV === "production";

  // Normalize known library errors to AppError
  let normalized = err;

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    normalized = new AppError("Invalid ID format", 400, true);
  }

  // Mongo duplicate key
  if (err.code === 11000) {
    const fields = Object.keys(err.keyValue || {});
    const msg = fields.length
      ? `Duplicate ${fields.join(", ")} Found`
      : "Duplicate field value";
    normalized = new AppError(msg, 409, true, { keyValue: err.keyValue });
  }

  // Mongoose validation
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors || {}).map((e) => e.message);
    normalized = new AppError(messages.join(", "), 400, true, { messages });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    normalized = new AppError("Invalid token. Please log in again.", 401, true);
  }
  if (err.name === "TokenExpiredError") {
    normalized = new AppError("Token expired. Please log in again.", 401, true);
  }

  const status = normalized.statusCode || 500;

  // Build safe payload
  const payload = {
    success: false,
    message:
      isProd && !normalized.isOperational
        ? "Internal Server Error"
        : normalized.message || "Error",
    errors: normalized.errors || null,
  };

  // Include stack only in dev
  if (!isProd) {
    payload.stack = err.stack;
    payload.name = err.name;
  }

  return res.status(status).json(payload);
};

module.exports = { errorHandler, notFoundHandler };
