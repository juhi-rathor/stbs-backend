const env = require("./config/envConfig.js");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const { requestLogger } = require("./middlewares/requestLogger.js");
const {
  errorHandler,
  notFoundHandler,
} = require("./middlewares/errorHandler.js");
const routes = require("./routes/index.js");
const { responseMiddleware } = require("./utills/response.js");
const path = require("path");
require("../src/crons/paymentReminderCron.js");
require("../src/crons/monthlyStatementCron.js");

const app = express();
// Security headers (Helmet aggregated)
app.use(helmet());
app.use(
  helmet.contentSecurityPolicy({
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'"],
    },
  })
);

// HSTS for production
if (env.NODE_ENV === "production") {
  app.use(
    helmet.hsts({
      maxAge: Number(env.HSTS_MAX_AGE),
      includeSubDomains: true,
      preload: true,
    })
  );
}
// Body parsers
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());
// CORS
const origins = env.CORS_ORIGINS.split(",").map((o) => o.trim());
app.use(
  cors({
    origin: origins,
    credentials: true,
  })
);
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
});

// Compression
app.use(compression());
// NoSQL injection sanitize
// app.use(mongoSanitize());
// Request logger
app.use(requestLogger);
// unified response helper
app.use(responseMiddleware);
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
// Routes
app.use("/api/v1", routes);
// 404 + error
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
