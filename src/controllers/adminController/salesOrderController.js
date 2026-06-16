const SalesOrder = require("../../models/salesOrder.model");
const Invoice =require("../../models/invoice.model")
const Counter = require("../../models/counter.model");
const Customer = require("../../models/customer.model");
const AppError = require("../../utills/AppError");
const catchAsync = require("../../utills/catchAsync");
const Product = require("../../models/product.model");
const Financial = require("../../models/financial.model");
const mongoose = require("mongoose");

// const createSalesOrder = catchAsync(async (req, res) => {
//   const adminId = req.admin._id;

//   const {
//     customerId,
//     customerOrderNo,
//     // purchaseOrderNo,
//     deliveryAddress,
//     deliveryMethod,
//     items,
//     notes,
//   } = req.body;

//   if (!customerId || !customerOrderNo || !deliveryAddress || !items?.length) {
//     throw new AppError("Missing required fields", 400);
//   }

//   if (!deliveryMethod) {
//     throw new AppError(
//       "Delivery method is required (Express/Eco/Collection)",
//       400
//     );
//   }

//   const customer = await Customer.findById(customerId);
//   if (!customer) throw new AppError("Invalid customer", 400);

//   // if cc customer credit limit is exceed then they are not allowed to oder

//   if (customer && customer.isSuspended) {
//     throw new AppError(
//       "Customer account is suspended due to overdue invoices. Cannot create order.",
//       400
//     );
//   }
//   // Generate SO Number
//   const counter = await Counter.findOneAndUpdate(
//     { name: "salesOrder" },
//     { $inc: { seq: 1 } },
//     { new: true, upsert: true }
//   );

//   // Format as SO1001 (not SO1)
//   const salesOrderNumber = `SO${1000 + counter.seq}`;

//   let totalNet = 0;
//   let totalVat = 0;
//   let totalGross = 0;

//   const updatedItems = [];

//   for (const item of items) {
//     if (!item.product || !item.qty || !item.unitPrice) {
//       throw new AppError("Invalid item data", 400);
//     }

//     const product = await Product.findById(item.product);
//     if (!product) throw new AppError("Invalid product", 400);

//     const net = item.qty * item.unitPrice - (item.discount || 0);
//     const vat = net * 0.2; // 20% VAT fixed
//     const gross = net + vat;

//     totalNet += net;
//     totalVat += vat;
//     totalGross += gross;

//     updatedItems.push({
//       product: item.product,
//       qty: item.qty,
//       unitPrice: item.unitPrice,
//       discount: item.discount || 0,
//       net: Number(net.toFixed(2)),
//       vat: Number(vat.toFixed(2)),
//       gross: Number(gross.toFixed(2)),
//     });
//   }

//   // if (customer.customerType === "CC") {
//   //   const outstanding = customer.accountBalance * -1; // convert negative → positive
//   //   const newOrderAmount = totalGross;

//   //   if (outstanding + newOrderAmount > customer.creditLimit) {
//   //     throw new AppError(
//   //       `Credit limit exceeded! Outstanding: £${outstanding}, New Order: £${newOrderAmount}, Limit: £${customer.creditLimit}`,
//   //       400
//   //     );
//   //   }
//   // }

//   const order = await SalesOrder.create({
//     salesOrderNumber,
//     customerId,
//     // customerOrderNo,
//     // purchaseOrderNo,
//     deliveryAddress,
//     deliveryMethod, // ADDED
//     customerType: customer.customerType,
//     items: updatedItems,
//     totalNet: Number(totalNet.toFixed(2)),
//     totalVat: Number(totalVat.toFixed(2)),
//     totalGross: Number(totalGross.toFixed(2)),
//     invoiceNumber: null, // invoice after dispatch
//     notes,
//     createdBy: adminId,
//   });

//   return res.ok(order, "Sales order created successfully");
// });

// const createSalesOrder = catchAsync(async (req, res) => {
//   const adminId = req.admin._id;

//   const { customerId, deliveryMethod, items, notes } = req.body;

//   if (!customerId || !items?.length) {
//     throw new AppError("Missing required fields", 400);
//   }

//   if (!deliveryMethod) {
//     throw new AppError(
//       "Delivery method is required (Express/Eco/Collection)",
//       400
//     );
//   }

//   const customer = await Customer.findById(customerId);
//   if (!customer) throw new AppError("Invalid customer", 400);

//   // 1. Check for manual suspension
//   if (customer && customer.isSuspended) {
//     throw new AppError(
//       "Customer account is suspended due to overdue invoices. Cannot create order.",
//       400
//     );
//   }

//   // ---------------------------------------------------------
//   // 2. NEW CHECK: Validate Previous Payments
//   // Check if any existing invoice for this customer is NOT paid
//   // ---------------------------------------------------------
//   const unpaidInvoice = await invoice.findOne({
//     customer: customerId,
//     isPaid: false
//   });

//   if (unpaidInvoice) {
//     throw new AppError(
//       `Cannot create order. Previous invoice (${unpaidInvoice.invoiceNo}) is pending payment.`,
//       400
//     );
//   }
//   // ---------------------------------------------------------

//   // Generate SO Number
//   const counter = await Counter.findOneAndUpdate(
//     { name: "salesOrder" },
//     { $inc: { seq: 1 } },
//     { new: true, upsert: true }
//   );

//   // Format as SO1001 (not SO1)
//   const salesOrderNumber = `SO${1000 + counter.seq}`;

//   let totalNet = 0;
//   let totalVat = 0;
//   let totalGross = 0;

//   const updatedItems = [];

//   for (const item of items) {
//     if (!item.product || !item.qty || !item.unitPrice) {
//       throw new AppError("Invalid item data", 400);
//     }

//     const product = await Product.findById(item.product);
//     if (!product) throw new AppError("Invalid product", 400);

//     const net = item.qty * item.unitPrice - (item.discount || 0);
//     const vat = net * 0.2; // 20% VAT fixed
//     const gross = net + vat;

//     totalNet += net;
//     totalVat += vat;
//     totalGross += gross;

//     updatedItems.push({
//       product: item.product,
//       qty: item.qty,
//       unitPrice: item.unitPrice,
//       discount: item.discount || 0,
//       net: Number(net.toFixed(2)),
//       vat: Number(vat.toFixed(2)),
//       gross: Number(gross.toFixed(2)),
//     });
//   }

//   const order = await SalesOrder.create({
//     salesOrderNumber,
//     customerId,
//     deliveryMethod,
//     customerType: customer.customerType,
//     items: updatedItems,
//     totalNet: Number(totalNet.toFixed(2)),
//     totalVat: Number(totalVat.toFixed(2)),
//     totalGross: Number(totalGross.toFixed(2)),
//     invoiceNumber: null, // invoice after dispatch
//     notes,
//     createdBy: adminId,
//   });

//   return res.ok(order, "Sales order created successfully");
// });
const createSalesOrder = catchAsync(async (req, res) => {
  const adminId = req.admin._id;

  const { customerId, customerOrderNo, purchaseOrderNo, deliveryAddress, deliveryMethod, items, notes } = req.body;

  // 1. Basic Validation
  if (!customerId || !items?.length) {
    throw new AppError("Missing required fields", 400);
  }

  if (!deliveryMethod) {
    throw new AppError(
      "Delivery method is required (Express/Eco/Collection)",
      400
    );
  }

  const customer = await Customer.findById(customerId);
  if (!customer) throw new AppError("Invalid customer", 400);

  // 2. Check for manual suspension
  if (customer && customer.isSuspended) {
    throw new AppError(
      "Customer account is suspended due to overdue invoices. Cannot create order.",
      400
    );
  }

  // 3. Validate Previous Payments (Check invoice dueDate first, then check dueDateDay)
  const now = new Date();
  
  // First check if there's any unpaid invoice with a dueDate that has already passed
  const overdueInvoice = await Invoice.findOne({
    customer: customerId,
    isPaid: false,
    dueDate: { $lt: now }  // Due date has passed
  });

  if (overdueInvoice) {
    // Invoice payment is overdue, now check if dueDateDay has also passed
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const dueDateDay = customer.dueDateDay || 0;

    // Get last day of current month
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Use the minimum of dueDateDay and last day of month
    const adjustedDueDay = Math.min(dueDateDay, lastDayOfMonth);
    
    // Calculate this month's due date
    const thisMonthDueDate = new Date(currentYear, currentMonth, adjustedDueDay);

    // If this month's dueDateDay has also passed, block the order
    if (now >= thisMonthDueDate && dueDateDay > 0) {
      throw new AppError(
        `Payment overdue. Invoice (${overdueInvoice.invoiceNo}) due date: ${overdueInvoice.dueDate.toDateString()}. ` +
        `Monthly payment due date (${adjustedDueDay}th) has also passed. Please clear the dues before creating new order.`,
        400
      );
    }
  }

  // ✅ 4. NEW CREDIT CHECK LOGIC for CC Customers
  let orderTotalGross = 0;
  
  // First calculate total order amount
  for (const item of items) {
    if (!item.product || Number(item.qty) <= 0 || Number(item.unitPrice) <= 0) {
      throw new AppError("Invalid item data: product, qty (>0), and unitPrice (>0) are required", 400);
    }
    
    const inputQty = Number(item.qty);
    const net = inputQty * item.unitPrice - (item.discount || 0);
    const vat = net * 0.2; // 20% VAT
    const gross = net + vat;
    orderTotalGross += gross;
  }

  // Apply PC/CC business logic
  if (customer.customerType === "PC") {
    // PC: Block if any negative balance (same as frontend)
    if (customer.accountBalance < 0) {
      const dueAmount = Math.abs(customer.accountBalance).toFixed(2);
      throw new AppError(
        `PC customer has outstanding payment of £${dueAmount}. Please clear dues before creating new order.`,
        400
      );
    }
  } else if (customer.customerType === "CC") {
    // CC: Calculate remaining credit = creditLimit + accountBalance (negative balance reduces available credit)
    const remainingCredit = customer.creditLimit + customer.accountBalance;
    
    if (orderTotalGross > remainingCredit) {
      const availableCredit = Math.max(0, remainingCredit).toFixed(2);
      const requiredCredit = orderTotalGross.toFixed(2);
      throw new AppError(
        `Insufficient credit limit. Order total £${requiredCredit} exceeds available credit £${availableCredit}. ` +
        `Current limit: £${customer.creditLimit.toFixed(2)}, Outstanding: £${Math.abs(customer.accountBalance).toFixed(2)}`,
        400
      );
    }
  }

  // 5. Generate SO Number
  const counter = await Counter.findOneAndUpdate(
    { name: "salesOrder" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const salesOrderNumber = `SO${1000 + counter.seq}`;

  let totalNet = 0;
  let totalVat = 0;
  let totalGross = 0;

  const updatedItems = [];

  // ---------------------------------------------------------
  // 6. PROCESS ITEMS (Updated for Pallet vs Board Logic)
  // ---------------------------------------------------------
  for (const item of items) {
    const product = await Product.findById(item.product);
    if (!product) throw new AppError("Invalid product", 400);

    // Determine Type and assign quantities
    const type = item.qtyType || "pallet"; // Default to pallet if not specified
    const inputQty = Number(item.qty);

    // Calculate Financials
    const net = inputQty * item.unitPrice - (item.discount || 0);
    const vat = net * 0.2; // 20% VAT fixed
    const gross = net + vat;

    totalNet += net;
    totalVat += vat;
    totalGross += gross;

    updatedItems.push({
      product: item.product,
      qtyType: type,          
      qty: inputQty,
      unitPrice: item.unitPrice,
      discount: item.discount || 0,
      net: Number(net.toFixed(2)),
      vat: Number(vat.toFixed(2)),
      gross: Number(gross.toFixed(2)),
    });
  }

  // 7. Create the Order
  const order = await SalesOrder.create({
    salesOrderNumber,
    customerId,
    customerOrderNo,
    purchaseOrderNo,
    deliveryAddress,
    deliveryMethod,
    customerType: customer.customerType,
    items: updatedItems,
    totalNet: Number(totalNet.toFixed(2)),
    totalVat: Number(totalVat.toFixed(2)),
    totalGross: Number(totalGross.toFixed(2)),
    invoiceNumber: null,
    notes,
    createdBy: adminId,
  });

  // ✅ Update customer account balance (add order total as negative balance)
  await Customer.findByIdAndUpdate(customerId, {
    $inc: { 
      accountBalance: -totalGross // Add order amount as negative balance
    }
  });

  return res.ok(order, "Sales order created successfully");
});


const updateSalesOrder = catchAsync(async (req, res) => {
  let session = null;
  const isSingleNode = mongoose.connection?.db?.client?.topology?.description?.type === "Single";
  if (!isSingleNode) {
    try {
      session = await mongoose.startSession();
      session.startTransaction();
    } catch (e) {
      session = null;
    }
  }

  const opts = session ? { session } : {};
  
  try {
    const adminId = req.admin._id;
    const { salesOrderId, customerOrderNo, purchaseOrderNo, deliveryAddress, deliveryMethod, items, notes } = req.body;

    // 1. Basic validation
    if (!salesOrderId) {
      throw new AppError("Sales Order ID is required", 400);
    }

    // 2. Fetch order with populated customer/products
    const order = await SalesOrder.findById(salesOrderId)
      .populate('customerId', 'customerType accountBalance creditLimit isSuspended businessName')
      .populate('items.product', 'productName stockQty PricePerBoard PricePerPallet')
      .session(session);
    
    if (!order) {
      throw new AppError("Sales Order not found", 404);
    }

    // 3. Status check (unchanged - perfect)
    if (["dispatched", "invoiced"].includes(order.status)) {
      throw new AppError("Cannot update dispatched or invoiced orders", 400);
    }

    const customer = order.customerId;
    if (!customer) {
      throw new AppError("Customer not found", 400);
    }

    // 4. CUSTOMER BLOCKING (PC/CC LOGIC - SAME AS CREATE)
    if (customer.isSuspended) {
      throw new AppError(
        `Customer ${customer.businessName} is suspended. Cannot update order.`,
        400
      );
    }

    // Check unpaid invoices
    const unpaidInvoice = await Invoice.findOne({
      customer: customer._id,
      dueDate: { $lt: new Date() },
      isPaid: false
    }).session(session);

    if (unpaidInvoice) {
      throw new AppError(
        `Customer has overdue invoice ${unpaidInvoice.invoiceNo}. Clear dues first.`,
        400
      );
    }

    // 5. BULK PROCESS ITEMS + STOCK VALIDATION
    let newTotalGross = 0;
    const validatedItems = [];
    const productIds = items?.map(item => item.product) || [];

    // Bulk fetch products
    const products = await Product.find({
      _id: { $in: productIds }
    }).session(session);
    const productMap = new Map(products.map(p => [p._id.toString(), p]));

    // Calculate current order total (before update)
    const currentTotalGross = order.items.reduce((sum, item) => sum + item.gross, 0);

    for (const item of items || []) {
      if (!item.product || Number(item.qty) <= 0 || Number(item.unitPrice) <= 0) {
        throw new AppError("Each item requires product, qty (>0), and unitPrice (>0)", 400);
      }

      const product = productMap.get(item.product);
      if (!product) {
        throw new AppError(`Product not found: ${item.product}`, 400);
      }

      const qty = Number(item.qty);
      
      // ✅ STOCK VALIDATION (compare with current order qty)
      const currentItem = order.items.find(i => i.product.toString() === item.product);
      const currentQty = currentItem ? currentItem.qty : 0;
      const netStockChange = qty - currentQty; // Only validate incremental change

      if (product.stockQty < netStockChange) {
        throw new AppError(
          `Insufficient stock for ${product.productName}. ` +
          `Available: ${product.stockQty}, Required change: ${netStockChange}`,
          400
        );
      }

      
      const net = qty * item.unitPrice - (item.discount || 0);
      const vat = net * 0.2;
      const gross = net + vat;

      newTotalGross += gross;

      validatedItems.push({
        product: item.product,
        qtyType: item.qtyType || 'pallet',
        qty,
        unitPrice: Number(item.unitPrice),
        discount: Number(item.discount || 0),
        net: Number(net.toFixed(2)),
        vat: Number(vat.toFixed(2)),
        gross: Number(gross.toFixed(2)),
      });
    }

    // 6. CREDIT CHECK (SAME LOGIC AS CREATE)
    if (customer.customerType === "PC") {
      if (customer.accountBalance < 0) {
        const dueAmount = Math.abs(customer.accountBalance).toFixed(2);
        throw new AppError(
          `PC customer has outstanding balance £${dueAmount}. Cannot update order.`,
          400
        );
      }
    } else if (customer.customerType === "CC") {
      const creditChange = newTotalGross - currentTotalGross;
      const remainingCredit = customer.creditLimit + customer.accountBalance;
      
      if (creditChange > 0 && remainingCredit < creditChange) {
        throw new AppError(
          `CC customer insufficient credit. New total £${newTotalGross.toFixed(2)} ` +
          `exceeds available credit £${remainingCredit.toFixed(2)}`,
          400
        );
      }
    }

    // 7. UPDATE ORDER TOTALS
    order.items = validatedItems;
    order.totalNet = Number(validatedItems.reduce((sum, i) => sum + i.net, 0).toFixed(2));
    order.totalVat = Number(validatedItems.reduce((sum, i) => sum + i.vat, 0).toFixed(2));
    order.totalGross = Number(newTotalGross.toFixed(2));

    // Apply other updates
    if (customerOrderNo !== undefined) order.customerOrderNo = customerOrderNo;
    if (purchaseOrderNo !== undefined) order.purchaseOrderNo = purchaseOrderNo;
    if (deliveryAddress !== undefined) order.deliveryAddress = deliveryAddress;
    if (deliveryMethod !== undefined) order.deliveryMethod = deliveryMethod;
    if (notes !== undefined) order.notes = notes;
    order.updatedBy = adminId;
    order.updatedAt = new Date();

    // 8. ATOMIC STOCK ADJUSTMENT (only for qty changes)
    const stockAdjustments = [];
    order.items.forEach((oldItem, index) => {
      const newItem = validatedItems[index];
      if (newItem && oldItem.product.toString() === newItem.product) {
        const qtyChange = newItem.qty - oldItem.qty;
        if (qtyChange !== 0) {
          stockAdjustments.push({
            updateOne: {
              filter: { _id: newItem.product },
              update: { $inc: { stockQty: -qtyChange } }
            }
          });
        }
      }
    });

    if (stockAdjustments.length > 0) {
      await Product.bulkWrite(stockAdjustments, opts);
    }

    // 9. CUSTOMER BALANCE ADJUSTMENT (only if total changed)
    const totalChange = newTotalGross - currentTotalGross;
    if (Math.abs(totalChange) > 0.01) {
      await Customer.findByIdAndUpdate(customer._id, {
        $inc: { accountBalance: -(newTotalGross - currentTotalGross) }
      }, opts);
    }

    const saveOpts = { validateModifiedOnly: true };
    if (session) saveOpts.session = session;
    await order.save(saveOpts);

    if (session) {
      await session.commitTransaction();
    }

    // Return populated order
    const updatedOrder = await SalesOrder.findById(salesOrderId)
      .populate('customerId', 'businessName customerCode')
      .populate('items.product', 'productName productCode stockQty');

    return res.ok(updatedOrder, "Sales Order updated successfully");

  } catch (error) {
    if (session) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    if (session) {
      session.endSession();
    }
  }
});


const getSalesOrderById = catchAsync(async (req, res) => {
  const { salesOrderId } = req.body;

  const order = await SalesOrder.findById(salesOrderId)
    .populate({
      path: "customerId",
      select: "businessName customerCode phone customerType email",
    })
    .populate({
      path: "items.product",
      select: "productName productCode unit",
    });

  if (!order) {
    throw new AppError("Sales Order not found", 404);
  }

  return res.ok(order, "sales order fetch successfully");
});

const getAllSalesOrders = catchAsync(async (req, res) => {
  let {
    page = 1,
    limit = 10,
    query = "",
    sortField = "createdAt",
    sortOrder = "desc",
    fromDate,
    toDate,
  } = req.query;

  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;
  query = query.trim();
  const skip = (page - 1) * limit;

  const filters = {};

  if (fromDate || toDate) {
    filters.createdAt = {};
    if (fromDate) filters.createdAt.$gte = new Date(fromDate);
    if (toDate) filters.createdAt.$lte = new Date(toDate);
  }

  if (query) {
    const regex = new RegExp(query, "i");

    const orFilters = [
      { salesOrderNumber: regex },
      { customerOrderNo: regex },
      { purchaseOrderNo: regex },
    ];

    const STATUS_VALUES = [
      "pending",
      "confirmed",
      "cancelled",
      "completed",
      "created",
      "invoiced",
    ];

    if (STATUS_VALUES.includes(query.toLowerCase())) {
      filters.status = query.toLowerCase();
    } else {
      filters.$or = orFilters;
    }

    // const customers = await Customer.find({
    //   $or: [{ customerCode: regex }, { businessName: regex }],
    // }).select("_id");

    // if (customers.length) {
    //   orFilters.push({
    //     customerId: { $in: customers.map((c) => c._id) },
    //   });
    // }

    // const products = await Product.find({
    //   $or: [{ productCode: regex }, { productName: regex }],
    // }).select("_id");

    // if (products.length) {
    //   orFilters.push({
    //     "items.product": { $in: products.map((p) => p._id) },
    //   });
    // }
    // filters.$or = orFilters;

    if (STATUS_VALUES.includes(query.toLowerCase())) {
      // ✅ ONLY status filter
      filters.status = new RegExp(`^${query}$`, "i"); // case-insensitive
    } else {
      // ✅ ONLY text search
      const regex = new RegExp(query, "i");

      const orFilters = [
        { salesOrderNumber: regex },
        { customerOrderNo: regex },
        { purchaseOrderNo: regex },
      ];

      const customers = await Customer.find({
        $or: [{ customerCode: regex }, { businessName: regex },{deliveryAddress:regex}],
      }).select("_id");

      if (customers.length) {
        orFilters.push({
          customerId: { $in: customers.map((c) => c._id) },
        });
      }

      const products = await Product.find({
        $or: [{ productCode: regex }, { productName: regex }],
      }).select("_id");

      if (products.length) {
        orFilters.push({
          "items.product": { $in: products.map((p) => p._id) },
        });
      }

      filters.$or = orFilters;
    }
  }

  const sort = {};
  sort[sortField] = sortOrder === "asc" ? 1 : -1;

  const [orders, total] = await Promise.all([
    SalesOrder.find(filters)
      .populate({
        path: "customerId",
        select: "businessName customerCode deliveryAddress",
      })
      .populate({
        path: "items.product",
        select: "productName productCode",
      })
      .sort(sort)
      .skip(skip)
      .limit(limit),

    SalesOrder.countDocuments(filters),
  ]);

  const totalPages = Math.ceil(total / limit);

  return res.ok(
    {
      orders,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    },
    "Sales orders fetched successfully"
  );
});

module.exports = {
  createSalesOrder,
  updateSalesOrder,
  getSalesOrderById,
  getAllSalesOrders,
};
