// src/modules/admin/admin.model.js
const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
  {
    name: String,
    email: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: String,
    isSuperAdmin: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deviceToken: { type: String, default: null },
    freightTeamEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Admin", adminSchema);
