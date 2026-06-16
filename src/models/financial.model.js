const mongoose = require("mongoose");

const financialSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },

    salesOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalesOrder",
      default: null,
    },

    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      default: null,
    },

    // PAYMENT | NON_CASH_ADJUSTMENT | ISSUE_REFUND | INVOICE
    transactionType: {
      type: String,
      enum: [
        "invoice",
        "non_cash_adjustment",
        "issue_refund",
        "payment",
        "refund",
        "adjustment",
        "proforma", // for both debit & credit adjustments
      ],
      required: true,
    },

    // credit = customer pays us → balance decreases
    credit: {
      type: Number,
      default: 0,
      min: 0,
    },

    // debit = customer owes us or refund issued → balance increases
    debit: {
      type: Number,
      default: 0,
      min: 0,
    },

    // running balance after this entry
    balance: {
      type: Number,
      required: true,
    },

    // CASH | BANK | CARD | TRANSFER | CHEQUE | ADJUSTMENT
    paymentMethod: {
      type: String,
      enum: [
        "cash",
        "bank",
        "card",
        "cheque",
        "transfer",
        "adjustment",
        "refund",
        "other",
      ],
      default: "other",
    },

    description: {
      type: String,
      trim: true,
    },

    referenceNo: {
      type: String,
      trim: true,
      default: null,
    },

    transactionDate: {
      type: Date,
      default: Date.now,
    },

    paymentDate: {
      type: Date,
    },
    dueDate: { type: Date },
    originalDueDate: { type: Date },
    isPaid: { type: Boolean, default: false },
    
    // Reminder tracking per invoice
    reminder1Sent: { type: Boolean, default: false },
    reminder2Sent: { type: Boolean, default: false },
    reminder3Sent: { type: Boolean, default: false },
    
    // isHalfPaid: { type: Boolean, default: false },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Financial", financialSchema);
