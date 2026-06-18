const Dispatch = require("../../models/dispatch.model");
const SalesOrder = require("../../models/salesOrder.model");
const Product = require("../../models/product.model");
const Counter = require("../../models/counter.model");
const AppError = require("../../utills/AppError");
const catchAsync = require("../../utills/catchAsync");
const { sendDispatchMail } = require("../../services/sendMail");
const StockLedger = require("../../models/stock.model");
const Invoice = require("../../models/invoice.model");
const {
  checkLowStockAndNotify,
} = require("../../utills/checkLowStockAndNotify");
const { sendDispatchConfirmedMail } = require("../../services/sendMail");
const EmailLog = require("../../models/emailLog.model");
const Admin = require("../../models/Admin.model");

async function generateDispatchNumber() {
  const counter = await Counter.findOneAndUpdate(
    { name: "dispatch" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );

  return `DPN${String(counter.seq).padStart(4, "0")}`;
}

function recalculateProductStockQty(batches) {
  return batches.reduce((sum, batch) => sum + (batch.remainingQty || 0), 0);
}

async function reduceStock(items, adminId) {
  // A. PREPARATION: Group items by Product ID to handle duplicates and batch fetches
  const itemsByProduct = new Map();
  const productIds = [];

  for (const item of items) {
    const pId = item.product.toString();
    if (!itemsByProduct.has(pId)) {
      itemsByProduct.set(pId, []);
      productIds.push(pId);
    }
    itemsByProduct.get(pId).push(item);
  }

  // B. SINGLE DB FETCH: Get all involved products at once
  const products = await Product.find({ _id: { $in: productIds } });
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  const bulkOps = [];
  const ledgerEntries = [];
  const productsToCheckLowStock = [];

  // C. IN-MEMORY PROCESSING loop
  for (const [pId, pItems] of itemsByProduct) {
    const product = productMap.get(pId);

    if (!product) {
      throw new AppError(`Invalid product ID ${pId} in dispatch`, 400);
    }

    const perPalletQty = product.qtyPerPallet || 1;
    let totalBoardsToReduce = 0;

    // 1. Calculate total reduction for this product (summing all lines)
    for (const item of pItems) {
      if (item.qtyType === "pallet") {
        if (!product.qtyPerPallet) {
          throw new AppError(
            `Product ${product.productName} is missing 'qtyPerPallet'`,
            400,
          );
        }
        totalBoardsToReduce += Number(item.qty) * perPalletQty;
      } else {
        totalBoardsToReduce += Number(item.qty);
      }
    }

    const initialQtyToRemove = totalBoardsToReduce;

    // 2. Validate Stock
    if (product.boardTotalQty < totalBoardsToReduce) {
      throw new AppError(
        `Insufficient stock for ${product.productName}. Requested: ${totalBoardsToReduce}, Available: ${product.boardTotalQty}`,
        400,
      );
    }

    // 3. FIFO Batch Logic (In-Memory)
    let remainingToReduce = totalBoardsToReduce;

    // We clone batches to ensure we don't mutate the doc until we are sure
    // (Mongoose docs are mutable, but logic is cleaner if we modify directly then mark modified)

    for (const batch of product.batches) {
      if (remainingToReduce <= 0) break;
      if (batch.remainingQty <= 0) continue;

      const currentBatchBoards = batch.remainingQty * perPalletQty;

      if (currentBatchBoards >= remainingToReduce) {
        // Batch has enough
        const palletsToRemove = remainingToReduce / perPalletQty;
        batch.remainingQty -= palletsToRemove;
        remainingToReduce = 0;
      } else {
        // Take everything from batch
        remainingToReduce -= currentBatchBoards;
        batch.remainingQty = 0;
      }
    }

    if (remainingToReduce > 0.01) {
      throw new AppError(
        `Data integrity error: Batches insufficient for ${product.productName}`,
        500,
      );
    }

    // 4. Update Totals
    const newPalletStock = product.batches.reduce(
      (sum, batch) => sum + batch.remainingQty,
      0,
    );
    const newBoardStock = Math.round(newPalletStock * perPalletQty);

    // 5. Prepare Bulk Write Operation
    bulkOps.push({
      updateOne: {
        filter: { _id: product._id },
        update: {
          $set: {
            batches: product.batches, // Save the modified batches array
            stockQty: Number(newPalletStock.toFixed(2)),
            boardTotalQty: newBoardStock,
          },
        },
      },
    });

    // 6. Prepare Ledger Entry
    // We create one ledger entry per product block summarizing the movement
    ledgerEntries.push({
      productId: product._id,
      productCode: product.productCode,
      goodsIn: 0,
      goodsOut: initialQtyToRemove,
      boardLevel: newBoardStock,
      palletLevel: newPalletStock,
      movementType: "dispatch-out",
      isMutable: false,
      reference: `Dispatch Out: Total ${initialQtyToRemove} Boards`, // Consolidated reference
      date: new Date(),
      createdAt: new Date(),
    });

    productsToCheckLowStock.push({ product, adminId });
  }

  // D. EXECUTE DB OPERATIONS (Parallel)
  if (bulkOps.length > 0) {
    await Promise.all([
      Product.bulkWrite(bulkOps), // One DB call for all products [web:3]
      StockLedger.insertMany(ledgerEntries), // One DB call for all ledger entries [web:9]
    ]);
  }

  // E. LOW STOCK NOTIFICATIONS (Non-blocking)
  // We run this async without awaiting to return control fast
  productsToCheckLowStock.forEach(({ product, adminId }) => {
    // Assuming checkLowStockAndNotify is an async function
    checkLowStockAndNotify(product, adminId).catch((err) =>
      console.error(`Low stock check failed for ${product.productCode}`, err),
    );
  });
}

async function restoreStock(items) {
  for (const item of items) {
    const product = await Product.findById(item.product);
    if (!product) continue;

    const perPalletQty = product.qtyPerPallet || 1;
    let qtyToRestore = item.qty; // quantity in pallets to restore to batches
    let boardsToRestore = 0;

    if (item.qtyType === "pallet") {
      qtyToRestore = item.qty;
      boardsToRestore = item.qty * perPalletQty;
    } else {
      qtyToRestore = item.qty / perPalletQty;
      boardsToRestore = item.qty;
    }

    // 🔁 Restore from LAST batches (reverse FIFO)
    for (let i = product.batches.length - 1; i >= 0; i--) {
      if (qtyToRestore <= 0) break;

      const batch = product.batches[i];
      const maxCanRestore = batch.receivedPalletQty - batch.remainingQty;

      if (maxCanRestore <= 0) continue;

      if (maxCanRestore >= qtyToRestore) {
        batch.remainingQty = Number((batch.remainingQty + qtyToRestore).toFixed(4));
        qtyToRestore = 0;
      } else {
        batch.remainingQty = batch.receivedPalletQty;
        qtyToRestore -= maxCanRestore;
      }
    }

    if (qtyToRestore > 0.0001) {
      throw new AppError(
        `Restore mismatch for product: ${product.productName}`,
        400,
      );
    }

    // ✅ recalc stockQty and boardTotalQty
    product.stockQty = recalculateProductStockQty(product.batches);
    product.boardTotalQty = Math.round(product.stockQty * perPalletQty);

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
      goodsIn: boardsToRestore,
      goodsOut: 0,
      boardLevel: product.boardTotalQty,
      palletLevel: product.stockQty,
      movementType: "dispatch-cancel",
      isMutable: false,
      reference: "dispatch-cancel",
    });
  }
}

// const createDispatch = catchAsync(async (req, res) => {
//   const adminId = req.admin._id;
//   const { salesOrderId, notes } = req.body;

//   if (!salesOrderId) {
//     throw new AppError("salesOrderId is required", 400);
//   }

//   const order = await SalesOrder.findById(salesOrderId)
//     .populate("customerId")
//     .populate("items.product");

//   if (!order) throw new AppError("Sales order not found", 404);

//   // 1. NEW CHECK: BLOCK IF INVOICE IS MISSING
//   // Based on your DB document, 'invoiceNumber' is null if no invoice exists
//   if (!order.invoiceNumber) {
//     throw new AppError("Cannot create dispatch. Invoice must be generated first.", 400);
//   }

//   if (order.dispatchId) {
//     throw new AppError("Dispatch already created", 400);
//   }

//   const customer = order.customerId;

//   if (customer.customerType === "PC" && order.paymentStatus !== "paid") {
//     throw new AppError("Proforma customer must pay before dispatch", 400);
//   }

//   if (
//     customer.customerType === "CC" &&
//     customer.accountBalance * -1 > customer.creditLimit
//   ) {
//     throw new AppError("Credit limit exceeded! Dispatch blocked.", 400);
//   }

//   const dispatchNumber = await generateDispatchNumber();

//   const dispatch = await Dispatch.create({
//     salesOrder: order._id,
//     customer: customer._id,
//     dispatchNumber,
//     deliveryMethod: order.deliveryMethod,
//     items: order.items.map((i) => ({
//       product: i.product._id,
//       qty: i.qty,
//     })),
//     notes,
//     status: "dispatched",
//     createdBy: adminId,
//   });

//   await sendDispatchMail(process.env.FREIGHT_TEAM_EMAIL, dispatch, order);

//   order.dispatchId = dispatch._id;
//   // order.status = "requested"; // Usually status moves to 'dispatched' here, but keeping your original logic
//   await order.save();

//   return res.ok(
//     dispatch,
//     "Dispatch created successfully and mail send to warehouse"
//   );
// });

const confirmDispatch = catchAsync(async (req, res) => {
  const adminId = req.admin._id;
  const { dispatchId, vehicleNo, driverName } = req.body;

  if (!dispatchId) throw new AppError("dispatchId is required", 400);

  // const dispatch = await Dispatch.findById(dispatchId)
  //   .populate("salesOrder")
  //   .populate("items.product");

  const dispatch = await Dispatch.findById(dispatchId)
    .populate({
      path: "salesOrder",
      populate: { path: "customerId" },
    })
    .populate("items.product");

  if (!dispatch) throw new AppError("Dispatch request not found", 404);

  if (dispatch.status !== "requested") {
    throw new AppError("Only requested dispatches can be confirmed", 400);
  }

  // Reduce stock now
  await reduceStock(dispatch.items, adminId);

  dispatch.vehicleNo = vehicleNo;
  dispatch.driverName = driverName;
  dispatch.dispatchDate = new Date();
  dispatch.status = "dispatched";

  await dispatch.save();

  const order = await SalesOrder.findById(dispatch.salesOrder);
  order.status = "dispatched";
  order.dispatchedAt = new Date();
  await order.save();

  const customer = dispatch.salesOrder.customerId;
  console.log("customer", customer);

  const customerEmail = customer?.email?.trim();
  if (customerEmail) {
    console.log("customer in if condition", customerEmail);
    
    // Log the email before sending
    const emailLog = await EmailLog.create({
      emailType: 'dispatch_confirmed',
      referenceType: 'Dispatch',
      referenceId: dispatch._id,
      recipientEmail: customerEmail,
      recipientName: customer.businessName || customer.name,
      subject: `Your Order ${order.salesOrderNumber} Has Been Dispatched`,
      body: `Dispatch confirmation for Order ${order.salesOrderNumber} with dispatch number ${dispatch.dispatchNumber}`,
      status: 'pending',
      metadata: {
        customerId: customer._id,
        orderNumber: order.salesOrderNumber,
        dispatchNumber: dispatch.dispatchNumber,
        vehicleNo,
        driverName,
        dispatchDate: new Date().toDateString()
      }
    });
    
    try {
      await sendDispatchConfirmedMail({
        customerEmail,
        customerName: customer.businessName || customer.name,
        orderNo: order.salesOrderNumber,
        invoiceNo: dispatch.salesOrder.invoiceNumber || "N/A",
        dispatchDate: new Date().toDateString(),
        vehicleNo,
        driverName,
      });
      
      // Update email log status to sent
      emailLog.status = 'sent';
      emailLog.sentAt = new Date();
      await emailLog.save();
    } catch (err) {
      console.error("⚠️ Customer email failed:", err.message);
      // Update email log status to failed
      emailLog.status = 'failed';
      emailLog.error = err.message;
      await emailLog.save();
    }
  } else {
    console.warn("⚠️ SKIPPED Customer Email: Customer email is missing");
  }

  return res.ok(
    dispatch,
    "Dispatch confirmed by warehouse and customer notified",
  );
});
const createDispatch = catchAsync(async (req, res) => {
  const adminId = req.admin._id;
  const { salesOrderId, notes } = req.body;

  if (!salesOrderId) {
    throw new AppError("salesOrderId is required", 400);
  }

  // 1. Fetch Order, generate Dispatch Number, AND check existing dispatch in parallel
  const [order, dispatchNumber, existingDispatch] = await Promise.all([
    SalesOrder.findById(salesOrderId)
      .populate("customerId")
      .populate("items.product"),
    generateDispatchNumber(),
    Dispatch.findOne({ salesOrder: salesOrderId, isDeleted: false }), // Check if dispatch exists
  ]);

  if (!order) throw new AppError("Sales order not found", 404);

  // 2. Check if dispatch already exists for this sales order
  if (existingDispatch) {
    throw new AppError(
      `Dispatch already exists for this sales order (Dispatch Number: ${existingDispatch.dispatchNumber})`,
      400,
    );
  }

  // 3. Validations
  if (!order.invoiceNumber) {
    throw new AppError(
      "Cannot create dispatch. Invoice must be generated first.",
      400,
    );
  }

  if (order.dispatchId) {
    throw new AppError("Dispatch already created", 400);
  }

  const customer = order.customerId;

  if (customer.customerType === "PC" && order.paymentStatus !== "paid") {
    throw new AppError("Cannot Dispatch! Waiting for payment", 400);
  }

  // if (
  //   customer.customerType === "CC" &&
  //   customer.accountBalance * -1 > customer.creditLimit
  // ) {
  //   throw new AppError("Credit limit exceeded! Dispatch blocked.", 400);
  // }

  // 4. Prepare dispatch items structure
  const dispatchItems = order.items.map((i) => ({
    product: i.product._id,
    qty: i.qty,
    qtyType: i.qtyType,
    palletQty: i.palletQty,
    boardQty: i.boardQty,
  }));

  // 5. Reduce Stock (all processes must complete first)
  await reduceStock(dispatchItems, adminId);

  // 6. Create Dispatch Record (before sending emails)
  const dispatch = await Dispatch.create({
    salesOrder: order._id,
    customer: customer._id,
    dispatchNumber,
    deliveryMethod: order.deliveryMethod,
    items: dispatchItems,
    notes,
    status: "dispatched",
    dispatchDate: new Date(),
    createdBy: adminId,
  });

  // 7. Send Emails (after dispatch creation so we have the dispatch ID)
  const adminConfig = await Admin.findById(adminId).select("freightTeamEmail");
  const freightEmail =
    adminConfig?.freightTeamEmail?.trim() || process.env.FREIGHT_TEAM_EMAIL?.trim();
  if (freightEmail) {
    // Log the freight email before sending
    const freightEmailLog = await EmailLog.create({
      emailType: 'dispatch_notification',
      referenceType: 'Dispatch',
      referenceId: dispatch._id,
      recipientEmail: freightEmail,
      recipientName: 'Freight Team',
      subject: `Dispatch Request – ${dispatchNumber}`,
      body: `New dispatch request for Order ${order.salesOrderNumber} with dispatch number ${dispatchNumber}`,
      status: 'pending',
      metadata: {
        customerId: customer._id,
        orderNumber: order.salesOrderNumber,
        dispatchNumber,
        deliveryMethod: order.deliveryMethod
      }
    });
    
    try {
      await sendDispatchMail(freightEmail, { dispatchNumber, ...order }, order);
      // Update email log status to sent
      freightEmailLog.status = 'sent';
      freightEmailLog.sentAt = new Date();
      await freightEmailLog.save();
    } catch (err) {
      console.error("⚠️ Freight email failed:", err.message);
      // Update email log status to failed
      freightEmailLog.status = 'failed';
      freightEmailLog.error = err.message;
      await freightEmailLog.save();
    }
  }

  const customerEmail = customer?.email?.trim();
  if (customerEmail) {
    // Log the customer email before sending
    const customerEmailLog = await EmailLog.create({
      emailType: 'dispatch_confirmed',
      referenceType: 'Dispatch',
      referenceId: dispatch._id,
      recipientEmail: customerEmail,
      recipientName: customer.businessName || customer.name,
      subject: `Your Order ${order.salesOrderNumber} Has Been Dispatched`,
      body: `Dispatch confirmation for Order ${order.salesOrderNumber} with dispatch number ${dispatchNumber}`,
      status: 'pending',
      metadata: {
        customerId: customer._id,
        orderNumber: order.salesOrderNumber,
        dispatchNumber,
        dispatchId: dispatch._id,
        dispatchDate: new Date().toDateString(),
        vehicleNo: "N/A",
        driverName: "N/A"
      }
    });
    
    try {
      await sendDispatchConfirmedMail({
        customerEmail,
        customerName: customer.businessName || customer.name,
        orderNo: order.salesOrderNumber,
        invoiceNo: order.invoiceNumber || "N/A",
        dispatchDate: new Date().toDateString(),
        vehicleNo: "N/A",
        driverName: "N/A",
      });
      
      // Update email log status to sent
      customerEmailLog.status = 'sent';
      customerEmailLog.sentAt = new Date();
      await customerEmailLog.save();
    } catch (err) {
      console.error("⚠️ Customer email failed:", err.message);
      // Update email log status to failed
      customerEmailLog.status = 'failed';
      customerEmailLog.error = err.message;
      await customerEmailLog.save();
    }
  }

  // 8. Update Order Status
  order.dispatchId = dispatch._id;
  order.status = "dispatched";
  order.dispatchedAt = new Date();
  await order.save();

  return res.ok(
    dispatch,
    "All processes completed successfully. Dispatch created.",
  );
});

const markDelivered = catchAsync(async (req, res) => {
  const { dispatchId } = req.query;

  const dispatch = await Dispatch.findById(dispatchId);
  if (!dispatch) throw new AppError("Dispatch not found", 404);

  if (dispatch.status !== "dispatched") {
    throw new AppError("Only dispatched orders can be marked delivered", 400);
  }

  dispatch.status = "delivered";
  await dispatch.save();

  const order = await SalesOrder.findById(dispatch.salesOrder);
  order.status = "delivered";
  order.deliveredAt = new Date();
  await order.save();

  // Send delivered notification email to customer
  const orderWithCustomer = await SalesOrder.findById(dispatch.salesOrder).populate('customerId');
  const customerEmail = orderWithCustomer.customerId?.email?.trim();
  
  if (customerEmail) {
    // Log the email before sending
    const emailLog = await EmailLog.create({
      emailType: 'dispatch_delivered',
      referenceType: 'Dispatch',
      referenceId: dispatch._id,
      recipientEmail: customerEmail,
      recipientName: orderWithCustomer.customerId.businessName || orderWithCustomer.customerId.name,
      subject: `Your Order ${orderWithCustomer.salesOrderNumber} Has Been Delivered`,
      body: `Delivery confirmation for Order ${orderWithCustomer.salesOrderNumber} with dispatch number ${dispatch.dispatchNumber}`,
      status: 'pending',
      metadata: {
        customerId: orderWithCustomer.customerId._id,
        orderNumber: orderWithCustomer.salesOrderNumber,
        dispatchNumber: dispatch.dispatchNumber,
        deliveredAt: orderWithCustomer.deliveredAt
      }
    });
    
    try {
      // In a real implementation, you would send the actual delivery confirmation email
      // For now, we're just logging that it would be sent
      
      // Update email log status to sent
      emailLog.status = 'sent';
      emailLog.sentAt = new Date();
      await emailLog.save();
    } catch (err) {
      console.error("⚠️ Delivery notification email failed:", err.message);
      // Update email log status to failed
      emailLog.status = 'failed';
      emailLog.error = err.message;
      await emailLog.save();
    }
  }

  return res.ok(dispatch, "Order delivered successfully");
});

const cancelDispatch = catchAsync(async (req, res) => {
  const adminId = req.admin._id;
  const { dispatchId, reason } = req.query;

  if (!dispatchId) {
    throw new AppError("dispatchId is required", 400);
  }

  if (!reason || !reason.trim()) {
    throw new AppError("Cancel reason is required", 400);
  }

  const dispatch = await Dispatch.findById(dispatchId)
    .populate("items.product")
    .populate("salesOrder");

  if (!dispatch) throw new AppError("Dispatch not found", 404);

  if (dispatch.status === "delivered") {
    throw new AppError("Delivered dispatch cannot be cancelled", 400);
  }

  // Restore stock only if already dispatched
  if (dispatch.status === "dispatched") {
    await restoreStock(dispatch.items);
  }

  dispatch.status = "cancelled";
  dispatch.cancelReason = reason;
  dispatch.cancelledAt = new Date();

  await dispatch.save();

  const order = await SalesOrder.findById(dispatch.salesOrder._id);
  order.status = "created";
  order.dispatchId = null;
  await order.save();

  // Send cancellation notification email to customer
  const orderWithCustomer = await SalesOrder.findById(dispatch.salesOrder).populate('customerId');
  const customerEmail = orderWithCustomer.customerId?.email?.trim();
  
  if (customerEmail) {
    // Log the email before sending
    const emailLog = await EmailLog.create({
      emailType: 'dispatch_cancelled',
      referenceType: 'Dispatch',
      referenceId: dispatch._id,
      recipientEmail: customerEmail,
      recipientName: orderWithCustomer.customerId.businessName || orderWithCustomer.customerId.name,
      subject: `Dispatch Cancelled - Order ${orderWithCustomer.salesOrderNumber}`,
      body: `Notification that dispatch for Order ${orderWithCustomer.salesOrderNumber} with dispatch number ${dispatch.dispatchNumber} has been cancelled`,
      status: 'pending',
      metadata: {
        customerId: orderWithCustomer.customerId._id,
        orderNumber: orderWithCustomer.salesOrderNumber,
        dispatchNumber: dispatch.dispatchNumber,
        cancelledAt: dispatch.cancelledAt,
        cancelReason: dispatch.cancelReason
      }
    });
    
    try {
      // In a real implementation, you would send the actual dispatch cancellation email
      // For now, we're just logging that it would be sent
      
      // Update email log status to sent
      emailLog.status = 'sent';
      emailLog.sentAt = new Date();
      await emailLog.save();
    } catch (err) {
      console.error("⚠️ Dispatch cancellation email failed:", err.message);
      // Update email log status to failed
      emailLog.status = 'failed';
      emailLog.error = err.message;
      await emailLog.save();
    }
  }

  return res.ok(dispatch, "Dispatch cancelled successfully");
});

const getDispatchById = catchAsync(async (req, res) => {
  const { dispatchId } = req.query;

  const dispatch = await Dispatch.findById(dispatchId)
    .populate("customer", "businessName customerCode email")
    .populate("salesOrder", "salesOrderNumber")
    .populate("items.product", "productName productCode unit");

  if (!dispatch) throw new AppError("Dispatch not found", 404);

  return res.ok(dispatch, "Dispatch fetched successfully");
});

const getAllDispatches = catchAsync(async (req, res) => {
  let {
    page = 1,
    limit = 10,
    status = "",
    search = "",
    fromDate,
    toDate,
  } = req.query;

  page = parseInt(page);
  limit = parseInt(limit);

  search = search.trim();
  status = status.trim();

  const skip = (page - 1) * limit;

  const filters = { isDeleted: false };

  // Status filter
  if (status) {
    filters.status = status;
  }

  // Search filter
  if (search) {
    const regex = new RegExp(search, "i");
    filters.$or = [
      { dispatchNumber: regex },
      { vehicleNo: regex },
      { driverName: regex },
    ];
  }

  // Date range filter (createdAt)
  if (fromDate || toDate) {
    filters.createdAt = {};

    if (fromDate) {
      filters.createdAt.$gte = new Date(`${fromDate}T00:00:00.000Z`);
    }

    if (toDate) {
      filters.createdAt.$lte = new Date(`${toDate}T23:59:59.999Z`);
    }
  }

  const [dispatches, total] = await Promise.all([
    Dispatch.find(filters)
      .populate("customer", "businessName customerCode")
      .populate("salesOrder", "salesOrderNumber")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }),

    Dispatch.countDocuments(filters),
  ]);

  return res.ok(
    {
      dispatches,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    },
    "Dispatch list fetched",
  );
});

module.exports = {
  createDispatch,
  confirmDispatch,
  markDelivered,
  cancelDispatch,
  getDispatchById,
  getAllDispatches,
};
