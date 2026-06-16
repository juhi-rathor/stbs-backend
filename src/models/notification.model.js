const mongoose = require("mongoose");

const stbsNotificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
    },

    // Type of notification
    type: {
      type: String,
      enum: [
        "booking_created",
        "order_created",
        "order_dispatched",
        "invoice_created",
        "payment_received",
        "refund_issued",
        "stock_alert",
        "reminder_overdue",
        "monthly_statement",
        "general",
      ],
      default: "general",
    },

    // 🔹 STBS has only Admin
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
      index: true,
    },

    // Optional reference (Invoice / Booking etc.)
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "recipientType",
      default: null,
    },

    recipientType: {
      type: String,
      enum: ["Invoice", "Order", "Customer", "Stock", "Booking"],
      default: null,
    },

    // Frontend navigation path
    path: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: ["unread", "read"],
      default: "unread",
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("StbsNotification", stbsNotificationSchema);
