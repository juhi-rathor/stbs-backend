const mongoose = require("mongoose");
const path = require("path");

// Load envConfig from backend source directory
const env = require("../src/config/envConfig");
const Admin = require("../src/models/Admin.model");

async function checkDb() {
  try {
    console.log("Connecting to:", env.MONGO_URI);
    await mongoose.connect(env.MONGO_URI);
    console.log("Connected.");
    const admins = await Admin.find({});
    console.log("Total admins found:", admins.length);
    console.log(admins);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkDb();
