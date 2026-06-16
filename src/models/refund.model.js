const mongoose = require("mongoose");

const refundSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },

    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      default: null, // refund may not be linked to an invoice
    },

    refundAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    reason: {
      type: String,
      trim: true,
    },

    paymentMethod: {
      type: String,
      enum: ["cash", "bank", "card", "cheque", "transfer"],
      required: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Refund", refundSchema);
