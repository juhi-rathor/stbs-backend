const { createLogger, format, transports } = require("winston");
require("winston-daily-rotate-file");

const isProd = process.env.NODE_ENV === "production";

const fileTransport = new transports.DailyRotateFile({
  level: "info",
  filename: "logs/app-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "30d",
});

fileTransport.on("error", (err) => {
  console.error("Logger transport error", err);
});

const logger = createLogger({
  level: isProd ? "info" : "debug",
  format: format.json(),
  transports: isProd
    ? [fileTransport]
    : [new transports.Console({ format: format.simple() })],
});

module.exports = logger;
