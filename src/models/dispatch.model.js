const mongoose = require("mongoose");

const dispatchSchema = new mongoose.Schema(
  {
    salesOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalesOrder",
      required: true,
      index: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },

    dispatchNumber: {
      type: String,
      unique: true,
    },

    dispatchDate: {
      type: Date,
      default: Date.now,
    },

    deliveryMethod: {
      type: String,
      enum: ["express", "eco", "collection"],
      required: true,
    },

    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        qtyType:{type:String, enum:["pallet","board"], default:"pallet"},
        qty: {
          type: Number,
          required: true,
        },
      },
    ],

    vehicleNo: {
      type: String,
      trim: true,
    },

    driverName: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: ["requested", "approved", "dispatched", "delivered", "cancelled"],
      default: "requested",
      index: true,
    },

    notes: String,

    cancelReason: {
      type: String,
      trim: true,
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },
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

module.exports = mongoose.model("Dispatch", dispatchSchema);
