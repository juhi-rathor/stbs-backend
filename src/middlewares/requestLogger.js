const logger = require("../utills/logger");

function requestLogger(req, res, next) {
  const start = Date.now();
  const userId = req.user?._id || null;
  res.on("finish", () => {
    logger.info("REQUEST", {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      responseTime: Date.now() - start,
      userId,
    });
  });
  next();
}

module.exports = { requestLogger };
