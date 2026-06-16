const Product = require("../../models/product.model");
const AppError = require("../../utills/AppError");
const catchAsync = require("../../utills/catchAsync");
const Stock = require("../../models/stock.model");
const Counter = require("../../models/counter.model");

function isEditableStockEntry(record) {
  const isStockIn = record?.movementType === "stock-in" || record?.reference === "stock-in";
  return Boolean(isStockIn && record?.batchNo && record?.isMutable !== false);
}

function isBatchConsumed(batch) {
  return Number(batch.remainingQty || 0) < Number(batch.receivedPalletQty || 0) - 0.0001;
}

async function generateBatchNo() {
  const counter = await Counter.findOneAndUpdate(
    { name: "batch" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  return `BATCH${1000 + counter.seq}`;
}

function recalculateBatchDrivenStock(product) {
  const totalPallets = (product.batches || []).reduce(
    (sum, batch) => sum + Number(batch.remainingQty || 0),
    0
  );
  const qtyPerPallet = Number(product.qtyPerPallet || 0);

  product.stockQty = Number(totalPallets.toFixed(2));
  product.boardTotalQty = qtyPerPallet > 0 ? Math.round(totalPallets * qtyPerPallet) : 0;
}

function calculateSimpleAvgCost(batches) {
  if (!batches || batches.length === 0) return 0;

  let totalCost = 0;
  let batchCount = 0;

  batches.forEach((batch) => {
    if (batch.remainingQty > 0 && batch.costPerUnit > 0) {
      totalCost += Number(batch.costPerUnit || 0);
      batchCount += 1;
    }
  });

  if (batchCount === 0) return 0;

  return Number((totalCost / batchCount).toFixed(2));
}

const addStock = catchAsync(async (req, res) => {
  const { productId, qty, reference } = req.body;

  if (!productId || qty === undefined) {
    throw new AppError("productId and qty are required", 400);
  }

  let session = null;
  const isSingleNode = Product.db?.client?.topology?.description?.type === "Single";
  if (!isSingleNode) {
    try {
      session = await Product.startSession();
      session.startTransaction();
    } catch (e) {
      session = null;
    }
  }

  const opts = session ? { session } : {};

  try {
    const product = await Product.findById(productId).session(session);
    if (!product) throw new AppError("Product not found", 404);

    const batchNo = await generateBatchNo();

    const newBatch = {
      batchNo,
      containerNo: "MANUAL",
      receivedPalletQty: Number(qty),
      remainingQty: Number(qty),
      purchasePrice: 0,
      shippingCharges: 0,
      exciseDuty: 0,
      vatRate: 0,
      totalCost: 0,
      costPerUnit: 0,
    };

    product.batches.push(newBatch);
    recalculateBatchDrivenStock(product);

    product.averageCost = calculateSimpleAvgCost(product.batches);

    if (
      product.isLowStock === true &&
      product.stockQty > product.lowStockWarning
    ) {
      product.isLowStock = false;
    }

    await product.save(opts);

    // Stock ledger entry
    await Stock.create(
      [
        {
          productId: product._id,
          productCode: product.productCode,
          goodsIn: Number(qty),
          goodsOut: 0,
          boardLevel: product.boardTotalQty,
          palletLevel: product.stockQty,
          batchNo,
          movementType: "stock-in",
          isMutable: true,
          reference: reference || "manual-goods-in",
        },
      ],
      opts
    );

    if (session) {
      await session.commitTransaction();
      session.endSession();
    }

    return res.ok(product, "Stock added successfully");
  } catch (error) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    throw error;
  }
});

const getAllStock = catchAsync(async (req, res) => {
  let {
    page = 1,
    limit = 10,
    query = "", // 🔥 replaced search → query
    sort = "createdAt",
    sortType = "desc",
  } = req.query;

  // Convert safely
  page = parseInt(page);
  limit = parseInt(limit);

  const skip = (page - 1) * limit;

  // Sorting
  const sortOrder = sortType === "asc" ? 1 : -1;
  let sortQuery = {};
  sortQuery[sort] = sortOrder;

  // Filters
  let filters = {};

  if (query) {
    const regex = new RegExp(query, "i");

    // Find matching products
    const matchedProducts = await Product.find({
      $or: [{ productName: regex }, { productCode: regex }],
    }).select("_id");

    const productIds = matchedProducts.map((p) => p._id);

    // Build search filters
    filters.$or = [
      { reference: regex }, // 🔥 search in reference
      ...(productIds.length ? [{ productId: { $in: productIds } }] : []),
    ];
  }

  // Query stock with filters
  const [records, total] = await Promise.all([
    Stock.find(filters)
      .populate("productId", "productName productCode")
      .sort(sortQuery)
      .skip(skip)
      .limit(limit),

    Stock.countDocuments(filters),
  ]);

  return res.ok(
    {
      records,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    },
    "Stock records fetched successfully"
  );
});

// const updateStock = catchAsync(async (req, res) => {
//   const { stockId, goodsIn, reference } = req.body;

//   if (!stockId) {
//     throw new AppError("stockId is required", 400);
//   }

//   const stock = await Stock.findById(stockId);

//   if (!stock) {
//     throw new AppError("Stock record not found", 404);
//   }

//   // Update only provided fields
//   if (goodsIn !== undefined) stock.goodsIn = goodsIn;
//   if (reference) stock.reference = reference;

//   await stock.save();

//   return res.ok(stock, "Stock updated successfully");
// });

const updateStock = catchAsync(async (req, res) => {
  const { stockId, goodsIn, goodsOut, reference } = req.body;

  if (!stockId) {
    throw new AppError("stockId is required", 400);
  }

  const newGoodsIn = goodsIn !== undefined ? Number(goodsIn) : undefined;
  const newGoodsOut = goodsOut !== undefined ? Number(goodsOut) : undefined;

  if (newGoodsIn !== undefined && (Number.isNaN(newGoodsIn) || newGoodsIn <= 0)) {
    throw new AppError("goodsIn must be greater than 0", 400);
  }

  if (newGoodsOut !== undefined && (Number.isNaN(newGoodsOut) || newGoodsOut < 0)) {
    throw new AppError("Invalid goodsOut value", 400);
  }

  if (newGoodsOut !== undefined && newGoodsOut !== 0) {
    throw new AppError("Only stock-in records are editable. goodsOut cannot be changed.", 400);
  }

  let session = null;
  const isSingleNode = Product.db?.client?.topology?.description?.type === "Single";
  if (!isSingleNode) {
    try {
      session = await Product.startSession();
      session.startTransaction();
    } catch (e) {
      session = null;
    }
  }

  const opts = session ? { session } : {};

  try {
    const stockRecord = await Stock.findById(stockId).session(session);
    if (!stockRecord) {
      throw new AppError("Stock record not found", 404);
    }

    if (!isEditableStockEntry(stockRecord)) {
      throw new AppError(
        "This stock entry is read-only. Only linked stock-in records can be edited.",
        400
      );
    }

    const prod = await Product.findById(stockRecord.productId).session(session);
    if (!prod) {
      throw new AppError("Product not found", 404);
    }

    const stock = await Stock.findById(stockId).session(session);

    const batch = prod.batches.find((item) => item.batchNo === stock.batchNo);
    if (!batch) {
      throw new AppError(
        "This stock record is not linked to an editable batch. Legacy records are read-only.",
        400
      );
    }

    if (newGoodsIn !== undefined) {
      if (isBatchConsumed(batch)) {
        throw new AppError(
          "Cannot edit quantity for a consumed batch. Only untouched batches can be edited.",
          400
        );
      }

      batch.receivedPalletQty = newGoodsIn;
      batch.remainingQty = newGoodsIn;
      stock.goodsIn = newGoodsIn;
    }

    if (reference !== undefined && String(reference).trim()) {
      stock.reference = String(reference).trim();
    }

    recalculateBatchDrivenStock(prod);
    prod.averageCost = calculateSimpleAvgCost(prod.batches);

    if (prod.isLowStock === true && prod.stockQty > prod.lowStockWarning) {
      prod.isLowStock = false;
    }

    stock.goodsOut = 0;
    stock.boardLevel = prod.boardTotalQty;
    stock.palletLevel = prod.stockQty;
    stock.movementType = "stock-in";
    stock.isMutable = true;

    await prod.save(opts);
    await stock.save(opts);

    if (session) {
      await session.commitTransaction();
      session.endSession();
    }

    // Return updated objects (fresh)
    const updatedStock = await Stock.findById(stockId).populate(
      "productId",
      "productName productCode"
    );
    const updatedProduct = await Product.findById(prod._id).select(
      "productName productCode stockQty boardTotalQty"
    );

    return res.ok(
      { stock: updatedStock, product: updatedProduct },
      "Stock updated successfully"
    );
  } catch (err) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    throw err;
  }
});

const deleteStock = catchAsync(async (req, res) => {
  const { stockId } = req.query;

  if (!stockId) {
    throw new AppError("stockId is required", 400);
  }

  let session = null;
  const isSingleNode = Product.db?.client?.topology?.description?.type === "Single";
  if (!isSingleNode) {
    try {
      session = await Product.startSession();
      session.startTransaction();
    } catch (e) {
      session = null;
    }
  }

  const opts = session ? { session } : {};

  try {
    const stockRecord = await Stock.findById(stockId).session(session);
    if (!stockRecord) {
      throw new AppError("Stock record not found", 404);
    }

    if (!isEditableStockEntry(stockRecord)) {
      throw new AppError(
        "This stock entry is read-only. Only linked stock-in records can be deleted.",
        400
      );
    }

    const product = await Product.findById(stockRecord.productId).session(session);
    if (!product) {
      throw new AppError("Product not found", 404);
    }

    const batchIndex = product.batches.findIndex(
      (item) => item.batchNo === stockRecord.batchNo
    );

    if (batchIndex === -1) {
      throw new AppError(
        "This stock record is not linked to an editable batch. Legacy records are read-only.",
        400
      );
    }

    const batch = product.batches[batchIndex];
    if (isBatchConsumed(batch)) {
      throw new AppError(
        "Cannot delete consumed batch. Only untouched batches can be deleted.",
        400
      );
    }

    product.batches.splice(batchIndex, 1);
    recalculateBatchDrivenStock(product);
    product.averageCost = calculateSimpleAvgCost(product.batches);

    if (product.isLowStock === true && product.stockQty > product.lowStockWarning) {
      product.isLowStock = false;
    }

    await product.save(opts);
    await Stock.deleteOne({ _id: stockRecord._id }, opts);

    if (session) {
      await session.commitTransaction();
      session.endSession();
    }

    return res.ok(
      {
        stockId,
        productId: product._id,
        batchNo: stockRecord.batchNo,
      },
      "Stock record deleted successfully"
    );
  } catch (error) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    throw error;
  }
});

module.exports = {
  addStock,
  getAllStock,
  updateStock,
  deleteStock,
};
