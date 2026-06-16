// src/modules/admin/admin.seed.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Admin = require("../models/Admin.model");
const env = require("../config/envConfig");

const adminToCreate = [
  {
    name: "SuperAdmin",
    email: "superadmin@yopmail.com",
  },
];

const seedAdmin = async () => {
  try {
    for (const a of adminToCreate) {
      let admin = await Admin.findOne({ email: a.email });

      const hash = await bcrypt.hash("Developer123#", 12);

      if (!admin) {
        admin = await Admin.create({
          name: a.name,
          email: a.email,
          passwordHash: hash,
          isSuperAdmin: true,
          status: "ACTIVE",
        });

        console.log(`✅ Admin created: ${a.email}`);
      } else {
        admin.name = a.name;
        admin.passwordHash = hash;
        admin.isSuperAdmin = true;
        admin.status = "ACTIVE";
        await admin.save();

        console.log(`🔄 Admin updated: ${a.email}`);
      }
    }

    console.log("🎉 Admin seeding completed");
  } catch (err) {
    console.error("❌ Admin seeding failed:", err);
  }
};

// Self Execute
(async () => {
  try {
    await mongoose.connect(env.MONGO_URI);
    console.log("Mongo connected");
    await seedAdmin();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();

module.exports = seedAdmin;
