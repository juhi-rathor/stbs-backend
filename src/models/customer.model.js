const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    customerCode: {
      type: String,
      required: true,
      unique: true,
    },

    businessName: { type: String, required: true }, // From PDF requirement

    name: { type: String }, // Optional (Not in PDF but helpful)

    primaryPhone: { type: String, required: true },
    secondaryPhone: { type: String },
    email: { type: String, lowercase: true },

    correspondenceAddress: {
      line1: { type: String },
      line2: { type: String },
      city: { type: String },
      state: { type: String },
      postcode: { type: String },
    },

    deliveryAddress: {
      line1: { type: String },
      line2: { type: String },
      city: { type: String },
      state: { type: String },
      postcode: { type: String },
    },

    customerType: {
      type: String,
      enum: ["CC", "PC"], // Credit or Proforma
      required: true,
    },

    creditLimit: {
      type: Number,
      default: 0,
    },

    category: {
      type: String,
      enum: ["trade", "retail", "vip", "cash"],
      default: "trade",
    },

    accountBalance: {
      type: Number,
      default: 0,
    },
    isArchived: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    dueDateDay: { type: Number, default: 1 },
    reminder1Sent: { type: Boolean, default: false },
    reminder2Sent: { type: Boolean, default: false },
    reminder3Sent: { type: Boolean, default: false },
    isSuspended: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Customer", customerSchema);
