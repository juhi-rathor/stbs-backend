/**
 * Standalone script to seed email templates into MongoDB.
 * Run: npm run seedEmailTemplates
 */
require("dotenv").config();
const { connectMongoose } = require("../config/db");
const { seedEmailTemplates } = require("./emailTemplateSeed");

(async () => {
  try {
    await connectMongoose();
    console.log("✅ MongoDB connected");
    await seedEmailTemplates();
    console.log("✅ Email templates seeded successfully");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err.message);
    process.exit(1);
  }
})();
