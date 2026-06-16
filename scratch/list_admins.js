const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const MONGO_URI = "mongodb://localhost:27017/stbs";

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB successfully");

  const db = mongoose.connection.db;
  const col = db.collection("admins");

  const admins = await col.find({}).toArray();
  console.log("Found admins:");
  for (const admin of admins) {
    console.log({
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      isActive: admin.isActive,
      passwordHash: admin.passwordHash
    });
  }

  await mongoose.disconnect();
}

main().catch(console.error);
