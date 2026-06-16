const SalesOrder = require("../../models/salesOrder.model");
const Counter = require("../../models/counter.model");
const Financial = require("../../models/financial.model");
const AppError = require("../../utills/AppError");
const catchAsync = require("../../utills/catchAsync");
const Invoice = require("../../models/invoice.model");
const { sendCustomersInvoiceMail } = require("../../services/sendMail");
const mongoose = require("mongoose");
const EmailLog = require("../../models/emailLog.model");
const createInvoice = catchAsync(async (req, res) => {
  const adminId = req.admin._id;
  const { salesOrderId } = req.body;

  if (!salesOrderId) {
    throw new AppError("Sales order ID is required", 400);
  }

  // Fetch order + customer + products
  const order = await SalesOrder.findById(salesOrderId)
    .populate("customerId")
    .populate("items.product");

  if (!order) throw new AppError("Sales order not found", 404);

  const customer = order.customerId;
  const now = new Date();

  const counter = await Counter.findOneAndUpdate(
    { name: "invoice" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const invoiceNo = `INV${String(counter.seq).padStart(4, "0")}`;

  let paymentDate;
  let dueDate;

  if (customer.customerType === "CC") {
    // Due Date is 1st of the month after skipping current month
    // Example: Jan -> March 1st, Feb -> April 1st
    dueDate = new Date(now.getFullYear(), now.getMonth() + 2, 1);
    paymentDate = dueDate;
  } else {
    paymentDate = now;
    dueDate = null;
  }



  
  let totalNet = 0,
    totalVat = 0,
    totalGross = 0;

  order.items.forEach((i) => {
    totalNet += i.net;
    totalVat += i.vat;
    totalGross += i.gross;
  });

  const invoice = await Invoice.create({
    invoiceNo,
    customer: customer._id,
    order: order._id,
    invoiceType: customer.customerType,

    net: totalNet,
    vat: totalVat,
    gross: totalGross,

    invoiceDate: now,
    paymentDate,
    dueDate,
    

    createdBy: adminId,
  });

  order.invoice = invoice._id;
  order.invoiceNumber = invoiceNo;
  order.status = "invoiced";
  order.invoicedAt = now;
  await order.save();

  const lastEntry = await Financial.findOne({ customer: customer._id }).sort({
    transactionDate: -1,
  });

  const previousBalance = lastEntry ? lastEntry.balance : 0;
  let newBalance = previousBalance - totalGross;

  await Financial.create({
    customer: customer._id,
    invoice: invoice._id,
    salesOrder: order._id,

    transactionType: "invoice",
    debit: totalGross,
    credit: 0,
    balance: newBalance,

    transactionDate: now,
    paymentDate,
    dueDate,
    createdBy: adminId,
  });
  // customer.accountBalance = newBalance;
  // if (
    //   customer.customerType === "CC" &&
    //   customer.accountBalance * -1 > customer.creditLimit
    // ) {
      //   throw new AppError("Credit limit exceeded! Dispatch blocked.", 400);
      // }
  await customer.save();

  // SEND INVOICE MAIL + LOG
  const isPC = customer.customerType === "PC";
  const invoiceSubject = isPC
    ? `Proforma Invoice ${invoiceNo}`
    : `VAT Invoice ${invoiceNo}`;

  let mailStatus = 'sent';
  let mailError = null;

  try {
    await sendCustomersInvoiceMail(customer.email, invoice, order);
  } catch (err) {
    mailStatus = 'failed';
    mailError = err.message;
    console.error("[invoiceController] Invoice mail failed:", err.message);
  }

  await EmailLog.create({
    emailType: 'invoice_created',
    referenceType: 'Invoice',
    referenceId: invoice._id,
    recipientEmail: customer.email,
    recipientName: customer.businessName || customer.name,
    subject: invoiceSubject,
    body: `Invoice ${invoiceNo} created for Order ${order.salesOrderNumber}`,
    status: mailStatus,
    sentAt: mailStatus === 'sent' ? new Date() : null,
    error: mailError,
    metadata: {
      customerId: customer._id,
      invoiceNo,
      invoiceType: customer.customerType,
      orderNumber: order.salesOrderNumber,
      gross: totalGross,
      dueDate: dueDate || null,
    },
  });

  return res.ok(invoice, "Invoice created successfully");
});

// const getAllInvoices = catchAsync(async (req, res) => {
//   let {
//     page = 1,
//     limit = 10,
//     query = "", // search invoiceNo
//     fromDate, // yyyy-mm-dd
//     toDate, // yyyy-mm-dd
//   } = req.query;

//   page = parseInt(page) || 1;
//   limit = parseInt(limit) || 10;
//   const skip = (page - 1) * limit;

//   const filters = {};

//   if (query) {
//     const regex = new RegExp(query, "i");
//     filters.invoiceNo = regex;
//   }

//   if (fromDate || toDate) {
//     filters.invoiceDate = {};

//     if (fromDate)
//       filters.invoiceDate.$gte = new Date(fromDate + "T00:00:00.000Z");

//     if (toDate) filters.invoiceDate.$lte = new Date(toDate + "T23:59:59.999Z");
//   }

//   const [invoices, total] = await Promise.all([
//     Invoice.find(filters)
//       .populate("customer", "businessName customerCode")
//       .sort({ invoiceDate: -1 }) // latest first
//       .skip(skip)
//       .limit(limit),

//     Invoice.countDocuments(filters),
//   ]);

//   return res.ok(
//     {
//       invoices,
//       pagination: {
//         total,
//         page,
//         limit,
//         totalPages: Math.ceil(total / limit),
//       },
//     },
//     "Invoices fetched successfully"
//   );
// });

const getAllInvoices = catchAsync(async (req, res) => {
  let {
    page = 1,
    limit = 10,
    query = "",
    fromDate,
    toDate,
    status, // ✅ paid | pending
  } = req.query;

  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;
  const skip = (page - 1) * limit;

  const filters = {
    // isRefunded: false
  };

  // 🔍 Search by invoice number
  if (query) {
    const regex = new RegExp(query, "i");
    filters.invoiceNo = regex;
  }

  // 📅 Date filter
  if (fromDate || toDate) {
    filters.invoiceDate = {};

    if (fromDate) {
      filters.invoiceDate.$gte = new Date(fromDate + "T00:00:00.000Z");
    }

    if (toDate) {
      filters.invoiceDate.$lte = new Date(toDate + "T23:59:59.999Z");
    }
  }

  // 💰 Status filter
  if (status === "paid") {
    filters.isPaid = true;
  }

  if (status === "pending") {
    filters.isPaid = false;
  }

  const [invoices, total] = await Promise.all([
    Invoice.find(filters)
      .populate("customer", "businessName customerCode")
      .sort({ invoiceDate: -1 })
      .skip(skip)
      .limit(limit),

    Invoice.countDocuments(filters),
  ]);

  return res.ok(
    {
      invoices,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    },
    "Invoices fetched successfully"
  );
});




const getInvoicesByCustomer = catchAsync(async (req, res) => {
  let {
    customerId, // ⬅️ Now extracted from query, not params
    page = 1,
    limit = 10,
    query = "",
    fromDate,
    toDate,
    status, // ✅ paid | pending
  } = req.query;

  // 1. Basic Validation for Customer ID
  if (!customerId) {
    return res.status(400).json({ message: "Customer ID is required" });
  }

  if (!mongoose.Types.ObjectId.isValid(customerId)) {
    return res.status(400).json({ message: "Invalid Customer ID format" });
  }

  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;
  const skip = (page - 1) * limit;

  // 2. Initialize filter with the specific customer
  const filters = { 
    customer: customerId,
    isRefunded: false  // ✅ Only show invoices that are NOT refunded
  };

  // 🔍 Search by invoice number
  if (query) {
    const regex = new RegExp(query, "i");
    filters.invoiceNo = regex;
  }

  // 📅 Date filter
  if (fromDate || toDate) {
    filters.invoiceDate = {};

    if (fromDate) {
      filters.invoiceDate.$gte = new Date(fromDate + "T00:00:00.000Z");
    }

    if (toDate) {
      filters.invoiceDate.$lte = new Date(toDate + "T23:59:59.999Z");
    }
  }

  // 💰 Status filter
  if (status === "paid") {
    filters.isPaid = true;
  }

  if (status === "pending") {
    filters.isPaid = false;
  }

  // 3. Execute queries in parallel
  const [invoices, total] = await Promise.all([
    Invoice.find(filters)
      .sort({ invoiceDate: -1 })
      .skip(skip)
      .limit(limit),

    Invoice.countDocuments(filters),
  ]);

  return res.ok(
    {
      invoices,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    },
    "Customer invoices fetched successfully"
  );
});


module.exports = {
  createInvoice,
  getAllInvoices,
getInvoicesByCustomer};
