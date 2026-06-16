const mongoose = require("mongoose");

const salesOrderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    qtyType:{type:String, enum:["pallet","board"], default:"pallet"},
    qty: { type: Number ,default:0},
    // boardQty: { type: Number,default:0 },
    unitPrice: { type: Number, required: true },

    discount: { type: Number, default: 0 },

    net: { type: Number },
    vat: { type: Number },
    gross: { type: Number },
  },
  { _id: false }
);

const salesOrderSchema = new mongoose.Schema(
  {
    salesOrderNumber: {
      type: String,
      required: true,
      unique: true,
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },

    customerOrderNo: {
      type: String,
    },

    purchaseOrderNo: {
      type: String,
    },

    orderDate: {
      type: Date,
      default: Date.now,
    },

    deliveryAddress: {
      type: String,
    },

    customerType: {
      type: String,
      enum: ["CC", "PC"],
      required: true,
    },

    // items: [
    //   {
    //     product: {
    //       type: mongoose.Schema.Types.ObjectId,
    //       ref: "Product",
    //       required: true,
    //     },
    //     qty: { type: Number, required: true },
    //     unitPrice: Number,
    //     discount: { type: Number, default: 0 },

    //     net: Number,
    //     vat: Number,
    //     gross: Number,
    //   },
    // ],

    items: [salesOrderItemSchema],

    totalNet: Number,
    totalVat: Number,
    totalGross: Number,

    paymentStatus: {
      type: String,
      enum: ["pending", "partial", "paid","refunded"],
      default: "pending",
    },

    status: {
      type: String,
      enum: [
        "created",
        "approved",
        "dispatched",
        "invoiced",
        "cancelled",
        "delivered",
        "requested",
      ],
      default: "created",
    },

    notes: String,

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
    invoiceNumber: { type: String, default: null },
    deliveryMethod: {
      type: String,
      enum: ["express", "eco", "collection"],
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SalesOrder", salesOrderSchema);
