const mongoose = require("mongoose");

const stockLedgerSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    productCode: String,
    batchNo: { type: String, default: null },

    goodsIn: { type: Number, default: 0 },
    goodsOut: { type: Number, default: 0 },

    boardLevel: { type: Number, required: true },
    palletLevel: { type: Number, required: true },
    reference: { type: String }, // dispatch in dispatch out or cancel
    movementType: { type: String, default: "system" },
    isMutable: { type: Boolean, default: false },
    date: { type: Date, default: Date.now },
  },

  { timestamps: true }
);

module.exports = mongoose.model("Stock", stockLedgerSchema);
