const { boolean } = require("joi");
const mongoose = require("mongoose");

const productBatchSchema = new mongoose.Schema(
  {
    batchNo: { type: String, required: true },
    receivedPalletQty: { type: Number, required: true },
    remainingQty: { type: Number, default: 0 },
    containerNo: { type: String },
    purchasePrice: { type: Number, required: true },
    shippingCharges: { type: Number, default: 0 },
    exciseDuty: { type: Number, default: 0 },
    vatRate: { type: Number, default: 0 },
    totalCost: { type: Number, required: true },
    costPerUnit: { type: Number, required: true },
    receivedDate: { type: Date, default: Date.now },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    productCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },

    size: { type: String, trim: true, default: "" },

    productImage: [
      {
        type: String,
        default: null,
      },
    ],
    description: { type: String },
    containerNo: { type: String, default: "" },

    unit: { type: String, default: "UNIT" },
    qtyPerPallet: {
      type: Number,
      default: 0,
    },
    PricePerBoard: {
      type: Number,
      default: 0,
    },
    PricePerPallet: {
      type: Number,
      default: 0, 
    },
    averageCost: {
      type: Number,
      default: 0, 
    },
    // 🟩 MAIN STOCK FIELDS (You Requested)
    stockQty: {
      type: Number,
      default: 0,
    },
    boardTotalQty:{
      type:Number ,
      default:0
    },

    lowStockWarning: {
      type: Number,
      default: 0,
    },
    isLowStock: {
      type: Boolean,
      default: false,
    },
    batches: [productBatchSchema],
    isDetails: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
