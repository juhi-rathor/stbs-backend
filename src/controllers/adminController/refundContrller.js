const Refund = require("../../models/refund.model");
const Financial = require("../../models/financial.model");
const stock =require("../../models/stock.model")
const Product = require("../../models/product.model")
const SalesOrder=require("../../models/salesOrder.model")
const Customer = require("../../models/customer.model");
const Invoice = require("../../models/invoice.model");
const AppError = require("../../utills/AppError");
const catchAsync = require("../../utills/catchAsync");
const {
  checkLowStockAndNotify,
} = require("../../utills/checkLowStockAndNotify");

// Helper function to recalculate stock from batches
function recalculateProductStockQty(batches) {
  return batches.reduce((sum, batch) => sum + (batch.remainingQty || 0), 0);
}

// Restock logic (inverse of dispatch - adds stock back using reverse FIFO)
async function restoreStock(items, adminId) {
  // A. PREPARATION: Group items by Product ID
  const itemsByProduct = new Map();
  const productIds = [];

  for (const item of items) {
    // Handle both populated objects and IDs
    const pId = (item.product._id || item.product).toString();
    if (!itemsByProduct.has(pId)) {
      itemsByProduct.set(pId, []);
      productIds.push(pId);
    }
    itemsByProduct.get(pId).push(item);
  }

  // B. SINGLE DB FETCH: Get all involved products at once
  const products = await Product.find({ _id: { $in: productIds } });
  const productMap = new Map(products.map(p => [p._id.toString(), p]));

  const bulkOps = [];
  const ledgerEntries = [];
  const productsToCheckLowStock = [];

  // C. IN-MEMORY PROCESSING loop
  for (const [pId, pItems] of itemsByProduct) {
    const product = productMap.get(pId);

    if (!product) {
      throw new AppError(`Invalid product ID ${pId} in refund`, 400);
    }

    const perPalletQty = product.qtyPerPallet || 1;
    let totalBoardsToRestore = 0;

    // 1. Calculate total restoration for this product (summing all lines)
    for (const item of pItems) {
      console.log('Restoring item:', item);
      if (item.qtyType === 'pallet') {
        if (!product.qtyPerPallet) {
          throw new AppError(`Product ${product.productName} is missing 'qtyPerPallet'`, 400);
        }
        totalBoardsToRestore += Number(item.qty) * perPalletQty;
      } else {
        totalBoardsToRestore += Number(item.qty);
      }
    }

    const initialQtyToRestore = totalBoardsToRestore;

    // 2. Reverse FIFO: Restore from LAST batches first
    let remainingToRestore = totalBoardsToRestore;

    for (let i = product.batches.length - 1; i >= 0; i--) {
      if (remainingToRestore <= 0) break;

      const batch = product.batches[i];
      const currentBatchBoards = batch.remainingQty * perPalletQty;
      const maxBoardsCanRestore = (batch.receivedPalletQty - batch.remainingQty) * perPalletQty;

      if (maxBoardsCanRestore <= 0) continue;

      if (maxBoardsCanRestore >= remainingToRestore) {
        // Batch can restore all remaining boards
        const palletsToRestore = remainingToRestore / perPalletQty;
        batch.remainingQty += palletsToRestore;
        remainingToRestore = 0;
      } else {
        // Restore as many boards as this batch can hold
        batch.remainingQty = batch.receivedPalletQty;
        remainingToRestore -= maxBoardsCanRestore;
      }
    }

    // 3. Update Totals
    const newPalletStock = product.batches.reduce((sum, batch) => sum + batch.remainingQty, 0);
    const newBoardStock = Math.round(newPalletStock * perPalletQty);

    // 4. Prepare Bulk Write Operation
    bulkOps.push({
      updateOne: {
        filter: { _id: product._id },
        update: {
          $set: {
            batches: product.batches,
            stockQty: Number(newPalletStock.toFixed(2)),
            boardTotalQty: newBoardStock
          }
        }
      }
    });

    // 5. Prepare Ledger Entry
    ledgerEntries.push({
      productId: product._id,
      productCode: product.productCode,
      goodsIn: initialQtyToRestore,
      goodsOut: 0,
      boardLevel: newBoardStock,
      palletLevel: newPalletStock,
      movementType: "refund-restoration",
      isMutable: false,
      reference: `Refund Restoration: Total ${initialQtyToRestore} Boards`,
      date: new Date(),
      createdAt: new Date()
    });

    productsToCheckLowStock.push({ product, adminId });
  }

  // D. EXECUTE DB OPERATIONS (Parallel)
  if (bulkOps.length > 0) {
    await Promise.all([
      Product.bulkWrite(bulkOps),
      stock.insertMany(ledgerEntries)
    ]);
  }

  // E. LOW STOCK NOTIFICATIONS (Non-blocking)
  productsToCheckLowStock.forEach(({ product, adminId }) => {
    checkLowStockAndNotify(product, adminId).catch(err => 
        console.error(`Low stock check failed for ${product.productCode}`, err)
    );
  });
}

// const createRefund = catchAsync(async (req, res) => {
//   const { customerId, invoiceId, refundAmount, reason, paymentMethod } =
//     req.body;
//   const adminId = req.admin._id;

//   if (!customerId || !refundAmount || !paymentMethod) {
//     throw new AppError(
//       "customerId, refundAmount and paymentMethod required",
//       400
//     );
//   }

//   const customer = await Customer.findById(customerId);
//   if (!customer) throw new AppError("Customer not found", 404);

//   // 2️⃣ If invoice provided, validate invoice
//   let invoice = null;
//   if (invoiceId) {
//     invoice = await Invoice.findById(invoiceId);
//     if (!invoice) throw new AppError("Invalid invoice", 404);
//   }

//   // 3️⃣ Create Refund Record
//   const refund = await Refund.create({
//     customer: customerId,
//     invoice: invoiceId || null,
//     refundAmount,
//     reason,
//     paymentMethod,
//     createdBy: adminId,
//   });

//   // 4️⃣ Get last financial entry for balance
//   const lastTxn = await Financial.findOne({ customer: customerId }).sort({
//     createdAt: -1,
//   });

//   const previousBalance = lastTxn ? lastTxn.balance : 0;
//   console.log("previous balance", previousBalance);
//   // Refund → CREDIT means customer ko paisa mil raha
//   const newBalance = previousBalance - refundAmount;
//   console.log("new balance", newBalance);

//   // 5️⃣ Create financial ledger entry
//   await Financial.create({
//     customer: customerId,
//     invoice: invoiceId || null,
//     transactionType: "refund",
//     description: reason || "Refund issued",
//     paymentMethod,
//     debit: 0,
//     credit: refundAmount,
//     balance: newBalance,
//     lastTransactionDate: new Date(),
//     createdBy: adminId,
//   });

//   return res.ok(
//     {
//       refund,
//       newBalance,
//     },
//     "Refund processed successfully"
//   );
// });



const createRefund = catchAsync(async (req, res) => {
  const { 
    customerId, 
    invoiceId, 
    refundAmount, 
    reason, 
    paymentMethod 
  } = req.body;
  
  const adminId = req.admin._id;

  // 1. Validation
  if (!customerId || !refundAmount || !paymentMethod) {
    throw new AppError(
      "customerId, refundAmount and paymentMethod required",
      400
    );
  }

  const customer = await Customer.findById(customerId);
  if (!customer) throw new AppError("Customer not found", 404);

  let invoice = null;
  let itemsToRestock = [];
  let shouldRestoreStock = false;
  let salesOrder = null;

  // 2. Handle Invoice and Duplicate Checks
  if (invoiceId) {
    // Check if this invoice has already been refunded
    const existingRefund = await Refund.findOne({ invoice: invoiceId });
    if (existingRefund) {
      throw new AppError("Already refunded for this invoice", 400);
    }

    invoice = await Invoice.findById(invoiceId);
    if (!invoice) throw new AppError("Invalid invoice", 404);

    // Get the original order to check dispatch status
    salesOrder = await SalesOrder.findById(invoice.order).populate('items.product');

    if (!salesOrder) {
      throw new AppError("Sales order not found for this invoice", 404);
    }

    // ✅ ONLY restore stock if the order was DISPATCHED
    if (salesOrder.status === "dispatched") {
      itemsToRestock = salesOrder.items;
      shouldRestoreStock = true;
    } else {
      // If not dispatched, just do payment refund (no stock restoration)
      shouldRestoreStock = false;
    }
  }

  // 3. Create the Refund Record
  const refund = await Refund.create({
    customer: customerId,
    invoice: invoiceId || null,
    refundAmount,
    reason,
    paymentMethod,
    createdBy: adminId,
  });

  // 4. RESTOCK LOGIC - Only if order was dispatched
  if (shouldRestoreStock && itemsToRestock && itemsToRestock.length > 0) {
    await restoreStock(itemsToRestock, adminId);
  }

  // 5. Handle Financials (Wallet/Balance Update - Always processed)
  const lastTxn = await Financial.findOne({ customer: customerId }).sort({
    createdAt: -1,
  });

  const previousBalance = lastTxn ? lastTxn.balance : 0;
  const credit = Number(refundAmount);
  
  const newBalance = previousBalance + credit;

  await Financial.create({
    customer: customerId,
    invoice: invoiceId || null,
    transactionType: "refund",
    description: reason || "Refund issued",
    paymentMethod,
    debit: 0,
    credit: credit,
    balance: newBalance,
    transactionDate: new Date(),
    createdBy: adminId,
  });

  // Update Customer Balance (use updateOne to avoid validation issues)
  await Customer.updateOne(
    { _id: customer._id },
    { accountBalance: newBalance }
  );

  // 6. Update SalesOrder paymentStatus to "refunded" if invoice exists
  if (salesOrder) {
    await SalesOrder.updateOne(
      { _id: salesOrder._id },
      { paymentStatus: "refunded" }
    );
  }

  // 7. Update Invoice isRefunded to true if invoice exists
  if (invoice) {
    await Invoice.updateOne(
      { _id: invoice._id },
      { isRefunded: true }
    );
  }

  return res.ok(
    {
      refund,
      newBalance,
      restockedItemsCount: shouldRestoreStock ? itemsToRestock.length : 0,
      stockRestored: shouldRestoreStock
    },
    shouldRestoreStock 
      ? "Refund processed and order stock restored successfully"
      : "Refund processed (payment refund only - order not yet dispatched)"
  );
});




// const getAllRefunds = catchAsync(async (req, res) => {
//   let {
//     query = "",
//     customerId,
//     invoiceId,
//     sort = "createdAt",
//     sortType = "desc",
//     limit = 10,
//     page = 1,
//   } = req.query;

//   // pagination
//   limit = parseInt(limit) || 10;
//   page = parseInt(page) || 1;
//   query = query.trim();
//   const skip = (page - 1) * limit;

//   const filters = {};

//   if (customerId) filters.customer = customerId;
//   if (invoiceId) filters.invoice = invoiceId;

//   // search
//   if (query) {
//     const regex = new RegExp(query, "i");
//     filters.$or = [{ reason: regex }];
//   }

//   // sorting
//   const sortOrder = sortType === "asc" ? 1 : -1;
//   const sortQuery = { [sort]: sortOrder };

//   const [refunds, total] = await Promise.all([
//     Refund.find(filters)
//       .populate("customer", "businessName customerCode email")
//       .populate("invoice", "invoiceNo gross")
//       .sort(sortQuery)
//       .skip(skip)
//       .limit(limit),

//     Refund.countDocuments(filters),
//   ]);

//   return res.ok(
//     {
//       refunds,
//       pagination: {
//         total,
//         page,
//         limit,
//         totalPages: Math.ceil(total / limit),
//       },
//     },
//     "Refunds fetched successfully"
//   );
// });

const getAllRefunds = catchAsync(async (req, res) => {
  let {
    query = "",
    customerId,
    invoiceId,
    sort = "createdAt",
    sortType = "desc",
    limit = 10,
    page = 1,
    fromDate,
    toDate,
  } = req.query;

  limit = parseInt(limit) || 10;
  page = parseInt(page) || 1;
  query = query.trim();
  const skip = (page - 1) * limit;

  const matchStage = {};

  if (customerId) matchStage.customer = new mongoose.Types.ObjectId(customerId);
  if (invoiceId) matchStage.invoice = new mongoose.Types.ObjectId(invoiceId);

  // 📅 Date filter
  if (fromDate || toDate) {
    matchStage.createdAt = {};

    if (fromDate) {
      matchStage.createdAt.$gte = new Date(fromDate + "T00:00:00.000Z");
    }

    if (toDate) {
      matchStage.createdAt.$lte = new Date(toDate + "T23:59:59.999Z");
    }
  }

  const searchStage = query
    ? {
        $or: [
          { reason: { $regex: query, $options: "i" } },
          { "customer.businessName": { $regex: query, $options: "i" } },
          { "customer.customerCode": { $regex: query, $options: "i" } },
          { "customer.email": { $regex: query, $options: "i" } },
          { "invoice.invoiceNo": { $regex: query, $options: "i" } },
        ],
      }
    : {};

  const sortOrder = sortType === "asc" ? 1 : -1;

  const pipeline = [
    { $match: matchStage },

    // join customer
    {
      $lookup: {
        from: "customers",
        localField: "customer",
        foreignField: "_id",
        as: "customer",
      },
    },
    { $unwind: "$customer" },

    // join invoice
    {
      $lookup: {
        from: "invoices",
        localField: "invoice",
        foreignField: "_id",
        as: "invoice",
      },
    },
    { $unwind: { path: "$invoice", preserveNullAndEmptyArrays: true } },

    // search
    Object.keys(searchStage).length ? { $match: searchStage } : null,

    // sort
    { $sort: { [sort]: sortOrder } },

    // pagination
    { $skip: skip },
    { $limit: limit },
  ].filter(Boolean);

  const countPipeline = [
    { $match: matchStage },
    {
      $lookup: {
        from: "customers",
        localField: "customer",
        foreignField: "_id",
        as: "customer",
      },
    },
    { $unwind: "$customer" },
    {
      $lookup: {
        from: "invoices",
        localField: "invoice",
        foreignField: "_id",
        as: "invoice",
      },
    },
    { $unwind: { path: "$invoice", preserveNullAndEmptyArrays: true } },
    Object.keys(searchStage).length ? { $match: searchStage } : null,
    { $count: "total" },
  ].filter(Boolean);

  const [refunds, countResult] = await Promise.all([
    Refund.aggregate(pipeline),
    Refund.aggregate(countPipeline),
  ]);

  const total = countResult[0]?.total || 0;

  return res.ok(
    {
      refunds,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    },
    "Refunds fetched successfully"
  );
});

const updateRefund = catchAsync(async (req, res) => {
  const { refundId, refundAmount, reason, paymentMethod } = req.body;
  const adminId = req.admin._id;

  const refund = await Refund.findById(refundId);
  if (!refund) throw new AppError("Refund not found", 404);

  const customer = await Customer.findById(refund.customer);
  if (!customer) throw new AppError("Customer not found", 404);

  const oldAmount = Number(refund.refundAmount);
  const newAmount = Number(refundAmount ?? oldAmount);

  if (newAmount <= 0) {
    throw new AppError("Refund amount must be greater than 0", 400);
  }

  // last financial balance
  const lastTxn = await Financial.findOne({ customer: customer._id }).sort({
    createdAt: -1,
  });

  let balance = lastTxn ? lastTxn.balance : 0;

  // 🔁 reverse old refund
  balance = balance - oldAmount;

  // ➕ apply new refund
  balance = balance + newAmount;

  // update refund record
  refund.refundAmount = newAmount;
  refund.reason = reason ?? refund.reason;
  refund.paymentMethod = paymentMethod ?? refund.paymentMethod;
  await refund.save();

  // new financial entry
  await Financial.create({
    customer: customer._id,
    invoice: refund.invoice,
    transactionType: "refund",
    debit: 0,
    credit: newAmount,
    balance,
    paymentMethod: refund.paymentMethod,
    description: reason || "Refund updated",
    transactionDate: new Date(),
    createdBy: adminId,
  });

  customer.accountBalance = balance;
  await Customer.updateOne(
    { _id: customer._id },
    { accountBalance: balance }
  );

  return res.ok(
    {
      refund,
      newBalance: balance,
    },
    "Refund updated successfully"
  );
});



module.exports = {
  createRefund,
  getAllRefunds,
  updateRefund,
};
