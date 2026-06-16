const Product = require("../../models/product.model");
const Counter = require("../../models/counter.model");
const AppError = require("../../utills/AppError");
const catchAsync = require("../../utills/catchAsync");
const StockLedger = require("../../models/stock.model");
// genrate month + year like 1225
// function generateBatchNo() {
//   const now = new Date();
//   const month = String(now.getMonth() + 1).padStart(2, "0"); // 01-12
//   const year = String(now.getFullYear()).slice(-2); // 25
//   return `BATC${month}${year}`; // Example: BATC1225
// }

async function generateBatchNo() {
  const counter = await Counter.findOneAndUpdate(
    { name: "batch" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  return `BATCH${1000 + counter.seq}`;
}

function calculateSimpleAvgCost(batches) {
  if (!batches || batches.length === 0) return 0;
  console.log("batches", batches);
  let totalCost = 0;
  let batchCount = 0;

  batches.forEach((batch) => {
    if (batch.remainingQty > 0 && batch.costPerUnit > 0) {
      totalCost += batch.costPerUnit;
      batchCount++;
    }
  });
  console.log("batches", batches);

  if (batchCount === 0) return 0;

  return Number((totalCost / batchCount).toFixed(2));
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

function isBatchConsumed(batch) {
  return Number(batch.remainingQty || 0) < Number(batch.receivedPalletQty || 0) - 0.0001;
}

// const createProduct = catchAsync(async (req, res) => {
//   const { productName, description, unit, size, productImage, PerUnitCost } =
//     req.body;

//   if (!productName) {
//     throw new AppError("Product name is required", 400);
//   }

//   const counter = await Counter.findOneAndUpdate(
//     { name: "productCode" },
//     { $inc: { seq: 1 } },
//     { new: true, upsert: true }
//   );

//   const productCode = `PROD${1000 + counter.seq}`;

//   const product = await Product.create({
//     productCode,
//     productName,
//     description,
//     unit,
//     PerUnitCost,
//     // lowStockWarning: lowStockWarning || 0,
//     stockQty: 0,
//     size,
//     productImage,
//   });

//   return res.ok(product, "Product created successfully");
// });

// const addProductBatch = catchAsync(async (req, res) => {
//   const {
//     productId,
//     containerNo,
//     receivedQty,
//     purchasePrice,
//     shippingCharges,
//     exciseDuty,
//     vatRate,
//   } = req.body;

//   if (!productId || !receivedQty || !purchasePrice) {
//     throw new AppError("Missing required fields", 400);
//   }

//   const product = await Product.findById(productId);
//   if (!product) throw new AppError("Product not found", 404);

//   // if (product.productCode !== productCode) {
//   //   throw new AppError("Product ID and productCode do not match", 400);
//   // }

//   const batchNo = generateBatchNo();

//   const totalCost =
//     Number(purchasePrice) +
//     Number(shippingCharges || 0) +
//     Number(exciseDuty || 0);

//   const costPerUnit = Number((totalCost / receivedQty).toFixed(2));

//   const newBatch = {
//     batchNo,
//     containerNo,
//     receivedQty,
//     purchasePrice,
//     shippingCharges: shippingCharges || 0,
//     exciseDuty: exciseDuty || 0,
//     vatRate: vatRate || 0,
//     totalCost,
//     costPerUnit,
//   };

//   product.batches.push(newBatch);

//   product.stockQty += receivedQty;

//   await product.save();

//   // await Stock.create({
//   //   productId: product._id,
//   //   productCode: product.productCode,
//   //   goodsIn: receivedQty,
//   //   goodsOut: 0,
//   //   stockLevel: product.stockQty,
//   //   reference: `batch-${batchNo}`,
//   // });

//   return res.ok(product, "Batch added successfully");
// });
const createProduct = catchAsync(async (req, res) => {
  const { productName, productCode, description, unit, size, productImage, containerNo } = req.body;

  if (!productName) {
    throw new AppError("Product name is required", 400);
  }

  let finalProductCode = productCode;

  // 1. If manual code provided, check for uniqueness
  if (finalProductCode) {
    const existingProduct = await Product.findOne({ productCode: finalProductCode });
    if (existingProduct) {
      throw new AppError(`Product code '${finalProductCode}' already exists`, 400);
    }
  } 
  // 2. If no code provided, auto-generate one
  else {
    const counter = await Counter.findOneAndUpdate(
      { name: "productCode" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    finalProductCode = `PROD${1000 + counter.seq}`;
  }

  // 3. Create Product with initial defaults and provided fields
  const product = await Product.create({
    productCode: finalProductCode,
    productName,
    stockQty: 0,
    description: description || "",
    unit: unit || "UNIT",
    qtyPerPallet: 0,
    PricePerBoard: 0,
    PricePerPallet: 0,
    size: size || "",
    productImage: productImage || [],
    containerNo: containerNo || "",
    PerUnitCost: 0
  });

  return res.ok(product, "Product initialized successfully");
});
const AddProductDetails = catchAsync(async (req, res) => {
  // const { id } = req.params; // Expecting product _id here
  const { id,description, unit, size, productImage, qtyPerPallet,PricePerBoard,PricePerPallet ,lowStockWarning} = req.body;
  console.log("id ", id, "body", req.body)

  const product = await Product.findByIdAndUpdate(
    id,
    {
      description,
      unit,
      size,
      productImage,
     
      lowStockWarning,
       qtyPerPallet,PricePerBoard,PricePerPallet,
       isDetails:true
    },
    { 
      new: true,
      runValidators: true 
    }
  );

  if (!product) {
    throw new AppError("Product not found", 404);
  }

  return res.ok(product, "Product details updated successfully");
});

const addProductBatch = catchAsync(async (req, res) => {
  const {
    productId,
    containerNo,
    receivedPalletQty,
    receivedQty,
    purchasePrice,
    shippingCharges,
    exciseDuty,
    vatRate,
  } = req.body;

  const finalQty = receivedPalletQty !== undefined ? receivedPalletQty : receivedQty;

  if (!productId || finalQty === undefined || !purchasePrice) {
    throw new AppError("Missing required fields", 400);
  }

  const product = await Product.findById(productId);
  if (!product) throw new AppError("Product not found", 404);

  const batchNo = await generateBatchNo();

  // 🔹 SAME formula as you want
  const totalCost =
    Number(purchasePrice) +
    Number(shippingCharges || 0) +
    Number(exciseDuty || 0);

  const costPerUnit = Number((totalCost / finalQty).toFixed(2));
  console.log("cost per unit", costPerUnit);
  const newBatch = {
    batchNo,
    containerNo,
    receivedPalletQty: Number(finalQty),
    remainingQty: Number(finalQty),
    purchasePrice: Number(purchasePrice),
    shippingCharges: shippingCharges || 0,
    exciseDuty: exciseDuty || 0,
    vatRate: vatRate || 0,
    totalCost,
    costPerUnit,
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
  await product.save();
  await StockLedger.create({
    productId: product._id,
    productCode: product.productCode,
    goodsIn: finalQty,
    goodsOut: 0,
    boardLevel: product.boardTotalQty,
    palletLevel: product.stockQty,
    batchNo,
    movementType: "stock-in",
    isMutable: true,
    reference: `stock-in`,
  });

  return res.ok(product, "Batch added successfully");
});

const updateProductBatch = catchAsync(async (req, res) => {
  const {
    productId,
    batchNo,
    receivedPalletQty,
    purchasePrice,
    shippingCharges,
    exciseDuty,
    vatRate,
    containerNo,
  } = req.body;

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
    if (!product) {
      throw new AppError("Product not found", 404);
    }

    const batch = product.batches.find((item) => item.batchNo === batchNo);
    if (!batch) {
      throw new AppError("Batch not found", 404);
    }

    if (receivedPalletQty !== undefined) {
      const newReceived = Number(receivedPalletQty);
      if (Number.isNaN(newReceived) || newReceived <= 0) {
        throw new AppError("receivedPalletQty must be greater than 0", 400);
      }

      if (isBatchConsumed(batch)) {
        throw new AppError(
          "Cannot edit quantity for a consumed batch. Only untouched batches can be edited.",
          400
        );
      }

      batch.receivedPalletQty = newReceived;
      batch.remainingQty = newReceived;
    }

    if (containerNo !== undefined) {
      batch.containerNo = containerNo;
    }

    if (purchasePrice !== undefined) {
      const value = Number(purchasePrice);
      if (Number.isNaN(value) || value < 0) {
        throw new AppError("purchasePrice cannot be negative", 400);
      }
      batch.purchasePrice = value;
    }

    if (shippingCharges !== undefined) {
      const value = Number(shippingCharges);
      if (Number.isNaN(value) || value < 0) {
        throw new AppError("shippingCharges cannot be negative", 400);
      }
      batch.shippingCharges = value;
    }

    if (exciseDuty !== undefined) {
      const value = Number(exciseDuty);
      if (Number.isNaN(value) || value < 0) {
        throw new AppError("exciseDuty cannot be negative", 400);
      }
      batch.exciseDuty = value;
    }

    if (vatRate !== undefined) {
      const value = Number(vatRate);
      if (Number.isNaN(value) || value < 0) {
        throw new AppError("vatRate cannot be negative", 400);
      }
      batch.vatRate = value;
    }

    const nextPurchasePrice = Number(batch.purchasePrice || 0);
    const nextShipping = Number(batch.shippingCharges || 0);
    const nextExcise = Number(batch.exciseDuty || 0);
    const nextQty = Number(batch.receivedPalletQty || 0);

    batch.totalCost = nextPurchasePrice + nextShipping + nextExcise;
    batch.costPerUnit = nextQty > 0 ? Number((batch.totalCost / nextQty).toFixed(2)) : 0;

    recalculateBatchDrivenStock(product);
    product.averageCost = calculateSimpleAvgCost(product.batches);

    if (product.isLowStock === true && product.stockQty > product.lowStockWarning) {
      product.isLowStock = false;
    }

    await product.save(opts);

    await StockLedger.findOneAndUpdate(
      { productId: product._id, batchNo, movementType: "stock-in" },
      {
        $set: {
          goodsIn: Number(batch.receivedPalletQty || 0),
          goodsOut: 0,
          boardLevel: product.boardTotalQty,
          palletLevel: product.stockQty,
          reference: "stock-in",
          isMutable: true,
          movementType: "stock-in",
          batchNo,
        },
      },
      opts
    );

    if (session) {
      await session.commitTransaction();
      session.endSession();
    }

    const updatedProduct = await Product.findById(productId);
    const updatedBatch = updatedProduct?.batches?.find((item) => item.batchNo === batchNo);

    return res.ok(
      { product: updatedProduct, batch: updatedBatch },
      "Product batch updated successfully"
    );
  } catch (error) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    throw error;
  }
});

const deleteProductBatch = catchAsync(async (req, res) => {
  const { productId, batchNo } = req.query;

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
    if (!product) {
      throw new AppError("Product not found", 404);
    }

    const batchIndex = product.batches.findIndex((item) => item.batchNo === batchNo);
    if (batchIndex === -1) {
      throw new AppError("Batch not found", 404);
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
    await StockLedger.deleteOne({
      productId: product._id,
      batchNo,
      movementType: "stock-in",
    }, opts);

    if (session) {
      await session.commitTransaction();
      session.endSession();
    }

    const updatedProduct = await Product.findById(productId);
    return res.ok(updatedProduct, "Product batch deleted successfully");
  } catch (error) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    throw error;
  }
});

const updateLowStockWarning = catchAsync(async (req, res) => {
  const { productId, lowStockWarning } = req.body;

  // validations
  if (!productId) {
    throw new AppError("productId is required", 400);
  }

  if (lowStockWarning === undefined) {
    throw new AppError("lowStockWarning is required", 400);
  }

  if (Number(lowStockWarning) < 0) {
    throw new AppError("lowStockWarning cannot be negative", 400);
  }

  // find product
  const product = await Product.findById(productId);
  if (!product) {
    throw new AppError("Product not found", 404);
  }

  // update only low stock warning
  product.lowStockWarning = Number(lowStockWarning);

  await product.save();

  return res.ok(product, "Low stock warning updated successfully");
});

const getProductById = catchAsync(async (req, res) => {
  const { productId } = req.query;

  if (!productId) throw new AppError("productId required", 400);

  const product = await Product.findById(productId);

  if (!product || product.isDeleted) {
    throw new AppError("Product not found", 404);
  }

  return res.ok(product, "Product fetched successfully");
});

const getAllProducts = catchAsync(async (req, res) => {
  let {
    query,
    sort = "createdAt",
    sortType = "desc",
    limit = 10,
    page = 1,
    isDetails, // New parameter
    isActive,
  } = req.query;

  query = query?.trim().replace(/\s+/g, " ");

  // 1. Convert boolean values
  if (typeof isActive === "string") {
    isActive = isActive.toLowerCase() === "true";
  } else {
    isActive = true; // default: show active products
  }

  // 2. Sanitize limit & page
  limit = parseInt(limit, 10) > 0 ? parseInt(limit, 10) : 10;
  page = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;

  let filters = { isActive };

  // 3. Handle isDetails Logic
  // If isDetails=true, show only fully detailed products.
  // If isDetails=false (or undefined), standard behavior (or show missing details depending on requirement).
  // Assuming you want "isDetails=true" to mean "Products that HAVE details filled in".
  if (isDetails === "true") {
    filters.$and = [
      { description: { $exists: true, $ne: "" } },
      { unit: { $exists: true, $ne: "" } },
      { size: { $exists: true, $ne: "" } },
    ];
  } 
  // Optional: If you want to fetch ONLY products MISSING details when isDetails=false
  else if (isDetails === "false") {
     filters.$or = [
      { description: { $exists: false } },
      { description: "" },
      { unit: { $exists: false } },
      { unit: "" },
      { size: { $exists: false } },
      { size: "" },
    ];
  }

  // 4. Search conditions
  if (query) {
    const regex = new RegExp(query, "i");
    // We use $and if existing filters exist, or just merge $or
    const searchFilter = {
      $or: [
        { productName: regex },
        { productCode: regex },
        { description: regex },
      ],
    };
    
    // Merge search into filters safely
    if (filters.$and) {
      filters.$and.push(searchFilter);
    } else {
      Object.assign(filters, searchFilter);
    }
  }

  // 5. Sorting
  let sortOrder = sortType === "asc" ? 1 : -1;
  let sortQuery = {};
  sortQuery[sort] = sortOrder;

  const skip = (page - 1) * limit;

  // 6. Fetch products + count
  const [products, total] = await Promise.all([
    Product.find(filters).sort(sortQuery).skip(skip).limit(limit),
    Product.countDocuments(filters),
  ]);

  const totalPages = Math.ceil(total / limit);

  return res.ok(
    {
      products,
      pagination: {
        total,
        page,
        totalPages,
        limit,
        isActive,
        isDetails: isDetails === "true", // return status
      },
    },
    "Products fetched successfully"
  );
});


const calculateAverageCost = (product) => {
  if (!product.batches || product.batches.length === 0) return 0;
  console.log("product batche", product.batches);
  let totalCost = 0;
  let totalQty = 0;

  product.batches.forEach((batch) => {
    totalCost += batch.totalCost;
    totalQty += batch.receivedPalletQty !== undefined ? batch.receivedPalletQty : (batch.receivedQty || 0);
  });
  console.log("total cost", totalCost);

  console.log("total quantity", totalQty);

  if (totalQty === 0) return 0;

  return Number((totalCost / totalQty).toFixed(2));
};

const getProductWithAverage = catchAsync(async (req, res) => {
  const { productId } = req.query;

  const product = await Product.findById(productId);
  if (!product) throw new AppError("Product not found", 404);

  const averageCost = calculateAverageCost(product);
  console.log("average cost", averageCost);

  return res.ok(
    {
      ...product.toObject(),
      averageCost,
    },
    "Product fetched successfully"
  );
});

const uploadProductImages = catchAsync(async (req, res, next) => {
  // No files uploaded
  if (!req.files || req.files.length === 0) {
    throw new AppError("No images uploaded", 400);
  }

  // Create URLs for uploaded images
  const imageUrls = req.files.map((file) => {
    return `${process.env.UPLOAD_PRODUCT_IMAGES}${file.filename}`;
  });

  return res.ok(
    {
      images: imageUrls,
    },
    "Product images uploaded successfully"
  );
});

const updateProduct = catchAsync(async (req, res) => {
  // 1. Support both 'productId' (standard) and 'id' (from your Edit Details dialog payload)
  const productId = req.body.productId || req.body.id;

  const {
    productName,
    description,
    unit,
    size,
    productImage,
    containerNo,
    isActive,
    lowStockWarning,
    PerUnitCost,
    // Add fields specific to Product Details Dialog
    qtyPerPallet,
    PricePerBoard,
    PricePerPallet
  } = req.body;

  if (!productId) {
    throw new AppError("Product ID is required", 400);
  }

  const product = await Product.findById(productId);
  if (!product || product.isDeleted) {
    throw new AppError("Product not found", 404);
  }

  // --- Standard Product Updates ---
  if (productName !== undefined) product.productName = productName;
  if (description !== undefined) product.description = description;
  if (unit !== undefined) product.unit = unit;
  if (size !== undefined) product.size = size;
  if (productImage !== undefined) product.productImage = productImage; // Handles array update
  if (containerNo !== undefined) product.containerNo = containerNo;
  
  if (typeof isActive === "boolean") {
    product.isActive = isActive;
  }

  // --- Numeric Updates (Handling String -> Number conversion) ---
  
  // 1. Low Stock Warning
  if (lowStockWarning !== undefined && lowStockWarning !== "") {
    product.lowStockWarning = Number(lowStockWarning);
  }

  // 2. Per Unit Cost
  if (PerUnitCost !== undefined && PerUnitCost !== "") {
    product.PerUnitCost = Number(PerUnitCost);
  }

  // 3. Qty Per Pallet (From Details Dialog)
  if (qtyPerPallet !== undefined && qtyPerPallet !== "") {
    product.qtyPerPallet = Number(qtyPerPallet);
  }

  // 4. Price Per Board (From Details Dialog)
  if (PricePerBoard !== undefined && PricePerBoard !== "") {
    product.PricePerBoard = Number(PricePerBoard);
  }

  // 5. Price Per Pallet (From Details Dialog)
  if (PricePerPallet !== undefined && PricePerPallet !== "") {
    product.PricePerPallet = Number(PricePerPallet);
  }

  await product.save();

  return res.ok(product, "Product updated successfully");
});


module.exports = {
  createProduct,
  AddProductDetails,
  getProductById,
  getAllProducts,
  addProductBatch,
  updateProductBatch,
  deleteProductBatch,
  getProductWithAverage,
  uploadProductImages,
  updateProduct,
  updateLowStockWarning,
};
