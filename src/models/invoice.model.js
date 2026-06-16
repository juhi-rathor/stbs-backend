const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNo: { type: String, unique: true, index: true },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalesOrder",
      required: true,
    },

    invoiceType: { type: String, enum: ["CC", "PC"], required: true },
    invoiceDate: { type: Date, default: Date.now },
    dueDate: { type: Date },
    net: { type: Number },
    vat: { type: Number },
    gross: { type: Number },
    isSettled: { type: Boolean, default: false },
    paymentDate: Date,
    isPaid: { type: Boolean, default: false },
    amountPaid: Number,
    amountDue: Number,
    isRefunded: { type: Boolean, default: false },
    // isDeleted: {
    //   type: Boolean,
    //   default: false,
    // },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Invoice", invoiceSchema);
