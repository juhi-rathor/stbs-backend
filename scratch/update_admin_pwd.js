const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const MONGO_URI = "mongodb://localhost:27017/stbs";

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB successfully");

  const db = mongoose.connection.db;
  const col = db.collection("admins");

  const newPassword = "Juhi@2503#$";
  const newHash = await bcrypt.hash(newPassword, 10);

  const result = await col.updateOne(
    { email: "superadmin@yopmail.com" },
    { $set: { passwordHash: newHash, isActive: true } }
  );

  console.log("Password update result:", result);

  const updatedAdmin = await col.findOne({ email: "superadmin@yopmail.com" });
  const isMatch = await bcrypt.compare(newPassword, updatedAdmin.passwordHash);
  console.log("Verified updated password matches:", isMatch);

  await mongoose.disconnect();
}

main().catch(console.error);
