const mongoose = require("mongoose");
const env = require("./envConfig");
const logger = require("../utills/logger");

async function connectMongoose() {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.MONGO_URI);
  logger.info("Mongo connected");
}
module.exports = { connectMongoose };
