const SalesOrder = require("../../models/salesOrder.model");
const Counter = require("../../models/counter.model");
const Financial = require("../../models/financial.model");
const AppError = require("../../utills/AppError");
const catchAsync = require("../../utills/catchAsync");
const Invoice = require("../../models/invoice.model");
const Customer = require("../../models/customer.model");
const { sendPaymentReceiptMail } = require("../../services/sendMail");
const EmailLog = require("../../models/emailLog.model");

// const makePayment = catchAsync(async (req, res) => {
//   const adminId = req.admin._id;

//   const {
//     customerId,
//     invoiceId,
//     amount,
//     paymentMethod,
//     referenceNo,
//     paymentDate,
//   } = req.body;

//   if (!customerId || !amount || !paymentMethod) {
//     throw new AppError("customerId, amount, paymentMethod required", 400);
//   }

//   const customer = await Customer.findById(customerId);
//   if (!customer) throw new AppError("Customer not found", 404);

//   // let order = null;
//   // if (salesOrderId) {
//   //   order = await SalesOrder.findById(salesOrderId);
//   //   if (!order) throw new AppError("Sales order not found", 404);
//   // }

//   let invoice = null;
//   if (invoiceId) {
//     invoice = await Invoice.findById(invoiceId);
//     if (!invoice) throw new AppError("Invoice not found", 404);
//   }

//   const credit = Number(amount);
//   let accountBalance = Number(customer.accountBalance || 0);
//   accountBalance += credit;

//   // 💰 FINANCIAL ENTRY
//   const entry = await Financial.create({
//     customer: customerId,
//     salesOrder: invoice ? invoice.order : null,
//     invoice: invoice ? invoice._id : null,
//     transactionType: "payment",
//     credit,
//     debit: 0,
//     balance: accountBalance,
//     paymentMethod,
//     referenceNo: referenceNo || null,
//     description: invoice
//       ? "Invoice payment received"
//       : "Advance payment (Proforma)",
//     transactionDate: paymentDate || new Date(),
//     createdBy: adminId,
//     paymentDate: invoice ? invoice.paymentDate : null,
//     dueDate: invoice ? invoice.dueDate : null,
//     // isPaid: type === "PAYMENT",
//   });

//   // Auto-settle invoice IF payment is positive

//   // if (invoice && type === "PAYMENT") {
//   //   invoice.amountPaid = (invoice.amountPaid || 0) + credit;
//   //   invoice.amountDue = invoice.gross - invoice.amountPaid;

//   //   // ✅ FINAL PAID CONDITION
//   //   if (invoice.amountPaid >= invoice.gross && accountBalance >= 0) {
//   //     invoice.isPaid = true;
//   //     invoice.isSettled = true;
//   //     invoice.paymentDate = formattedDate;

//   //     // Mark invoice financial entry paid
//   //     await Financial.updateOne(
//   //       { invoice: invoiceId, transactionType: "invoice" },
//   //       { $set: { isPaid: true, dueDate: null } }
//   //     );
//   //   } else {
//   //     invoice.isPaid = false;
//   //     invoice.isSettled = false;
//   //   }

//   // ✅ NORMAL INVOICE PAYMENT (CC)
//   if (invoice) {
//     console.log("invoice", invoice);
//     invoice.amountPaid = (invoice.amountPaid || 0) + credit;
//     console.log("invoice amount paid", invoice.amountPaid);
//     invoice.amountDue = invoice.gross - invoice.amountPaid;
//     console.log("invoice due", invoice.amountDue);

//     if (invoice.amountDue <= 0) {
//       if (invoice.amountDue <= 0) {
//         invoice.isPaid = true;
//         invoice.isSettled = true;
//         invoice.paymentDate = new Date();

//         // 🔑 UPDATE INVOICE FINANCIAL ENTRY
//         await Financial.updateOne(
//           { invoice: invoice._id, transactionType: "invoice" },
//           { $set: { isPaid: true, dueDate: null } }
//         );

//         // 🔑 PC CUSTOMER → MARK ORDER PAID
//         if (invoice.invoiceType === "PC") {
//           await SalesOrder.updateOne(
//             { _id: invoice.order },
//             { $set: { paymentStatus: "paid" } }
//           );
//         }
//       }
//     }
//     await invoice.save();
//   }
//   customer.accountBalance = accountBalance;
//   await customer.save();

//   return res.ok(entry, "Payment recorded successfully");
// });

// const makePayment = catchAsync(async (req, res) => {
//   const adminId = req.admin._id;

//   const {
//     customerId,
//     invoiceId,
//     amount,
//     paymentMethod,
//     referenceNo,
//     paymentDate,
//   } = req.body;

//   if (!customerId || !invoiceId || !amount || !paymentMethod) {
//     throw new AppError(
//       "customerId, invoiceId, amount, paymentMethod required",
//       400
//     );
//   }

//   // ===============================
//   // FETCH CUSTOMER
//   // ===============================
//   const customer = await Customer.findById(customerId);
//   if (!customer) throw new AppError("Customer not found", 404);

//   // ===============================
//   // FETCH INVOICE
//   // ===============================
//   const invoice = await Invoice.findById(invoiceId);
//   if (!invoice) throw new AppError("Invoice not found", 404);

//   // ===============================
//   // ACCOUNTING
//   // ===============================
//   const credit = Number(amount);
//   let accountBalance = Number(customer.accountBalance || 0);
//   accountBalance += credit;

//   // ===============================
//   // CREATE PAYMENT LEDGER
//   // ===============================
//   const entry = await Financial.create({
//     customer: customerId,
//     salesOrder: invoice.order,
//     invoice: invoice._id,
//     transactionType: "payment",
//     credit,
//     debit: 0,
//     balance: accountBalance,
//     paymentMethod,
//     referenceNo: referenceNo || null,
//     description: "Invoice payment received",
//     transactionDate: paymentDate || new Date(),
//     createdBy: adminId,
//     paymentDate: invoice.paymentDate,
//     dueDate: invoice.dueDate,
//     isPaid: false, // 🔑 ALWAYS FALSE FOR PAYMENT ENTRY
//   });

//   // ===============================
//   // UPDATE INVOICE
//   // ===============================
//   invoice.amountPaid = (invoice.amountPaid || 0) + credit;
//   invoice.amountDue = invoice.gross - invoice.amountPaid;

//   const invoiceFullyPaid =
//     invoice.amountDue <= 0 && accountBalance >= 0;

//   if (invoiceFullyPaid) {
//     invoice.isPaid = true;
//     invoice.isSettled = true;
//     invoice.paymentDate = new Date();

//     // 🔑 UPDATE INVOICE LEDGER ENTRY
//     await Financial.updateOne(
//       { invoice: invoice._id, transactionType: "invoice" },
//       { $set: { isPaid: true, dueDate: null } }
//     );

//     // 🔑 UPDATE SALES ORDER (PC + CC BOTH)
//     await SalesOrder.updateOne(
//       { _id: invoice.order },
//       { $set: { paymentStatus: "paid" } }
//     );
//   } else {
//     invoice.isPaid = false;
//     invoice.isSettled = false;

//     // 🔁 keep order pending
//     await SalesOrder.updateOne(
//       { _id: invoice.order },
//       { $set: { paymentStatus: "pending" } }
//     );
//   }

//   await invoice.save();

//   // ===============================
//   // SAVE CUSTOMER BALANCE
//   // ===============================
//   customer.accountBalance = accountBalance;
//   await customer.save();

//   return res.ok(entry, "Payment recorded successfully");
// });

const makePayment = catchAsync(async (req, res) => {
  const adminId = req.admin._id;

  const {
    customerId,
    invoiceId,
    amount,
    paymentMethod,
    referenceNo,
    paymentDate,
  } = req.body;

  if (!customerId || !invoiceId || !amount || !paymentMethod) {
    throw new AppError(
      "customerId, invoiceId, amount, paymentMethod required",
      400
    );
  }

  // FETCH CUSTOMER
  const customer = await Customer.findById(customerId);
  if (!customer) throw new AppError("Customer not found", 404);

  // FETCH INVOICE
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) throw new AppError("Invoice not found", 404);

  // ACCOUNTING
  const credit = Number(amount);
  let accountBalance = Number(customer.accountBalance || 0);
  accountBalance += credit;

  // CREATE PAYMENT LEDGER
  const entry = await Financial.create({
    customer: customerId,
    salesOrder: invoice.order,
    invoice: invoice._id,
    transactionType: "payment",
    credit,
    debit: 0,
    balance: accountBalance,
    paymentMethod,
    referenceNo: referenceNo || null,
    description: "Invoice payment received",
    transactionDate: paymentDate || new Date(),
    createdBy: adminId,
    paymentDate: invoice.paymentDate,
    dueDate: invoice.dueDate,
    isPaid: false,
  });

  // UPDATE INVOICE
invoice.amountPaid = (invoice.amountPaid || 0) + credit;
invoice.amountDue = Math.max(invoice.gross - invoice.amountPaid, 0);

const invoiceFullyPaid = invoice.amountPaid >= invoice.gross;

if (invoiceFullyPaid) {
  invoice.isPaid = true;
  invoice.isSettled = true;
  invoice.paymentDate = paymentDate || new Date();

  await Financial.updateOne(
    { invoice: invoice._id, transactionType: "invoice" },
    { $set: { isPaid: true, dueDate: null } }
  );

  await Financial.updateOne(
    { _id: entry._id },
    { $set: { isPaid: true, dueDate: null } }
  );

  await SalesOrder.updateOne(
    { _id: invoice.order },
    { $set: { paymentStatus: "paid" } }
  );

  // await Customer.updateOne(
  //   { _id: customerId },
  //   {
  //     $set: {
  //       reminder1Sent: false,
  //       reminder2Sent: false,
  //       reminder3Sent: false,
  //       isSuspended: false,
  //     },
  //   }
  // );
} else {
  invoice.isPaid = false;
  invoice.isSettled = false;

  await SalesOrder.updateOne(
    { _id: invoice.order },
    { $set: { paymentStatus: "pending" } }
  );
}


  await invoice.save();

  // SAVE CUSTOMER BALANCE
  customer.accountBalance = accountBalance;
  if (accountBalance >= 0) {
    customer.reminder1Sent = false;
    customer.reminder2Sent = false;
    customer.reminder3Sent = false;
    customer.isSuspended = false;
  }
  await customer.save();

  // SEND PAYMENT RECEIPT MAIL + LOG
  const receiptSubject = `Payment Receipt – ${invoice.invoiceNo}`;
  let mailStatus = 'sent';
  let mailError = null;

  try {
    await sendPaymentReceiptMail({ customer, invoice, payment: entry });
  } catch (err) {
    mailStatus = 'failed';
    mailError = err.message;
    console.error("[financialController] Payment receipt mail failed:", err.message);
  }

  await EmailLog.create({
    emailType: 'payment_receipt',
    referenceType: 'Invoice',
    referenceId: invoice._id,
    recipientEmail: customer.email,
    recipientName: customer.businessName || customer.name,
    subject: receiptSubject,
    body: `Payment of £${credit} received for Invoice ${invoice.invoiceNo} via ${paymentMethod}`,
    status: mailStatus,
    sentAt: mailStatus === 'sent' ? new Date() : null,
    error: mailError,
    metadata: {
      customerId: customer._id,
      invoiceNo: invoice.invoiceNo,
      amountPaid: credit,
      paymentMethod,
      referenceNo: referenceNo || null,
      invoiceFullyPaid,
    },
  });

  return res.ok(entry, "Payment recorded successfully");
});
const createNoncashAdjustment = catchAsync(async (req, res) => {
  const { 
    customerId, 
    adjustmentAmount, 
    adjustmentType, 
    reason 
  } = req.body;
  
  // const adminId = req.admin._id;

  // 1. Validation
  if (!customerId || !adjustmentAmount || !adjustmentType) {
    throw new AppError(
      "customerId, adjustmentAmount, and adjustmentType (credit/debit) are required",
      400
    );
  }

  if (!["credit", "debit"].includes(adjustmentType)) {
    throw new AppError("adjustmentType must be 'credit' or 'debit'", 400);
  }

  const customer = await Customer.findById(customerId);
  if (!customer) throw new AppError("Customer not found", 404);

  // 2. Get last financial entry for current balance
  const lastTxn = await Financial.findOne({ customer: customerId }).sort({
    createdAt: -1,
  });

  const previousBalance = lastTxn ? lastTxn.balance : 0;
  const amount = Number(adjustmentAmount);

  // 3. Calculate new balance based on adjustment type
  let newBalance;
  if (adjustmentType === "credit") {
    newBalance = previousBalance + amount;
  } else {
    // debit
    newBalance = previousBalance - amount;
  }

  // 4. Create financial ledger entry for noncash adjustment
  const adjustment = await Financial.create({
    customer: customerId,
    invoice: null,
    transactionType: "non_cash_adjustment",
    description: reason || `Noncash ${adjustmentType} adjustment`,
    debit: adjustmentType === "debit" ? amount : 0,
    credit: adjustmentType === "credit" ? amount : 0,
    balance: newBalance,
    transactionDate: new Date(),
    createdBy: "6969c2fd1076018fc61d1459",
  });

  // 5. Update Customer Account Balance
  if(newBalance >= 0){

    await Customer.updateOne(
      { _id: customer._id },
      { accountBalance: newBalance,
        reminder1Sent: false,
        reminder2Sent: false,
        reminder3Sent: false,
        isSuspended: false,
      }
    );
  }else{
    await Customer.updateOne(
      { _id: customer._id },
      { accountBalance: newBalance}
    );
  }

  return res.ok(
    {
      adjustment,
      previousBalance,
      adjustmentAmount: amount,
      adjustmentType,
      newBalance,
    },
    `Noncash ${adjustmentType} adjustment of ${amount} applied successfully`
  );
});
const getCustomerFinanceHistory = catchAsync(async (req, res) => {
  const { customerId } = req.query;

  if (!customerId) throw new AppError("customerId required", 400);

  const ledger = await Financial.find({ customer: customerId })
    .sort({ transactionDate: -1 })
    .populate("invoice", "invoiceNo gross")
    .populate("salesOrder", "salesOrderNumber");

  return res.ok(ledger, "Customer ledger fetched");
});

const getAllCustomerPayments = catchAsync(async (req, res) => {
  let {
    page = 1,
    limit = 10,
    query = "",
    sortField = "transactionDate",
    sortOrder = "desc",
    customerId,
    type,
  } = req.query;

  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;
  const skip = (page - 1) * limit;

  const filters = {};

  if (customerId) filters.customer = customerId;
  if (type) filters.transactionType = type;

  let invoiceIds = [];
  let salesOrderIds = [];
  let customerIds = [];

  if (query.trim()) {
    const regex = new RegExp(query.trim(), "i");

    // 🔹 Search in customers
    const customers = await Customer.find({
      $or: [
        { businessName: regex },
        { customerCode: regex },
        { phone: regex },
        { email: regex },
      ],
    }).select("_id");

    customerIds = customers.map((c) => c._id);

    // 🔹 Search in invoices
    const invoices = await Invoice.find({ invoiceNo: regex }).select("_id");
    invoiceIds = invoices.map((i) => i._id);

    // 🔹 Search in sales orders
    const orders = await SalesOrder.find({
      salesOrderNumber: regex,
    }).select("_id");
    salesOrderIds = orders.map((o) => o._id);

    filters.$or = [
      { description: regex },
      { referenceNo: regex },
      { transactionType: regex },
      { customer: { $in: customerIds } },
      { invoice: { $in: invoiceIds } },
      { salesOrder: { $in: salesOrderIds } },
    ];
  }

  const sort = {};
  sort[sortField] = sortOrder === "asc" ? 1 : -1;

  const [transactions, total] = await Promise.all([
    Financial.find(filters)
      .populate("customer", "businessName customerCode phone email")
      .populate({
        path: "invoice",
        select: "invoiceNo gross net vat dueDate createdAt order",
        populate: {
          path: "order",
          select: "salesOrderNumber items",
          populate: {
            path: "items.product",
            select: "productCode name size",
          },
        },
      })
      .populate("salesOrder", "salesOrderNumber")
      .sort(sort)
      .skip(skip)
      .limit(limit),

    Financial.countDocuments(filters),
  ]);

  const formatted = transactions.map((txn) => {
    let productCodes = [];

    if (txn.invoice?.order?.items) {
      txn.invoice.order.items.forEach((i) => {
        if (i.product) {
          productCodes.push(i.product.productCode);
        }
      });
    }

    return {
      _id: txn._id,
      date: txn.transactionDate,
      invoiceNo: txn.invoice?.invoiceNo || "-",
      salesOrderNo:
        txn.invoice?.order?.salesOrderNumber ||
        txn.salesOrder?.salesOrderNumber ||
        "-",
      paymentType: txn.paymentMethod,
      productCodes: productCodes.length ? productCodes : ["-"],
      description: txn.description,
      debit: txn.debit,
      credit: txn.credit,
      balance: txn.balance,
      
      // Return due date from invoice document.
      dueDate: txn.invoice?.dueDate || null,

      customerId: txn.customer?._id || "_",
      customerName: txn.customer?.businessName || "-",
      customerCode: txn.customer?.customerCode || "-",
      invoiceGross: txn.invoice?.gross || 0,
      invoiceNet: txn.invoice?.net || 0,
      invoiceVat: txn.invoice?.vat || 0,
    };
  });

  return res.ok(
    {
      transactions: formatted,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    },
    "Customer payment history fetched successfully"
  );
});


const getUpcomingPayments = catchAsync(async (req, res) => {
  let {
    customerId,
    fromDate,
    toDate,
    search = "",
    page = 1,
    limit = 10,
  } = req.query;

  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;
  const skip = (page - 1) * limit;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  console.log("TODAY:", today);

  const filters = {
    isPaid: false,
    isRefunded: false,
  };

  if (fromDate || toDate) {
    filters.dueDate = {};

    if (fromDate) {
      const startDate = new Date(fromDate);
      startDate.setHours(0, 0, 0, 0);
      filters.dueDate.$gte = startDate;
    }

    if (toDate) {
      const endDate = new Date(toDate);
      endDate.setHours(23, 59, 59, 999);
      filters.dueDate.$lte = endDate;
    }
  } 
  // else {
  //   const upcomingDays = 5;
  //   const upcomingTill = new Date(today);
  //   upcomingTill.setDate(today.getDate() + upcomingDays);

  //   filters.dueDate = {
  //     $gte: today,
  //     $lte: upcomingTill,

  //   };
  // }

  if (customerId) {
    filters.customer = customerId;
  }

  let searchFilters = {};
  if (search.trim()) {
    const regex = new RegExp(search, "i");

    const customers = await Customer.find({
      $or: [{ businessName: regex }, { customerCode: regex }],
    }).select("_id");

    searchFilters = {
      $or: [
        { invoiceNo: regex },
        { customer: { $in: customers.map((c) => c._id) } },
      ],
    };
  }

  const finalFilter = search ? { $and: [filters, searchFilters] } : filters;

  const [invoices, total] = await Promise.all([
    Invoice.find(finalFilter)
      .populate("customer", "businessName customerCode phone email")
      .populate({
        path: "order",
        select: "salesOrderNumber items",
        populate: {
          path: "items.product",
          select: "productCode name size",
        },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),

    Invoice.countDocuments(finalFilter),
  ]);

  let runningTotal = 0;

  const formatted = invoices.map((inv) => {
    runningTotal += inv.amountDue ?? inv.gross;

    return {
      ...inv.toObject(),
      daysLeft: Math.ceil(
        (new Date(inv.paymentDate) - today) / (1000 * 60 * 60 * 24)
      ),
      runningTotal,
    };
  });

  return res.ok(
    {
      invoices: formatted,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    },
    "Upcoming payments fetched successfully"
  );
});

const getOverduePayments = catchAsync(async (req, res) => {
  let { query = "", page = 1, limit = 10 } = req.query;

  page = parseInt(page);
  limit = parseInt(limit);
  const skip = (page - 1) * limit;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueCustomers = await Customer.find({
    reminder1Sent: true,
    reminder2Sent: true,
    reminder3Sent: true,
  }).select("_id");

  const customerIds = overdueCustomers.map((c) => c._id);

  const filters = {
    isPaid: false,
    customer: { $in: customerIds },
  };

  if (query.trim()) {
    const regex = new RegExp(query, "i");

    const searchedCustomers = await Customer.find({
      $or: [{ businessName: regex }, { customerCode: regex }],
    }).select("_id");

    filters.$or = [
      { invoiceNo: regex },
      { customer: { $in: searchedCustomers.map((c) => c._id) } },
    ];
  }

  const [invoices, total] = await Promise.all([
    Invoice.find(filters)
      .populate(
        "customer",
        "businessName customerCode phone email reminder3Sent"
      )
      .populate({
        path: "order",
        select: "salesOrderNumber",
      })
      .sort({ paymentDate: 1 })
      .skip(skip)
      .limit(limit),

    Invoice.countDocuments(filters),
  ]);

  let runningTotal = 0;

  const formatted = invoices.map((inv) => {
    runningTotal += inv.amountDue ?? inv.gross;

    return {
      ...inv.toObject(),
      paymentStatus: "OVERDUE",
      runningTotal,
    };
  });

  return res.ok(
    {
      payments: formatted,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    },
    "Overdue payments fetched successfully"
  );
});

const sendPaymentReceipt = catchAsync(async (req, res) => {
  const { paymentId } = req.query;

  if (!paymentId) {
    throw new AppError("paymentId is required", 400);
  }

  const payment = await Financial.findById(paymentId)
    .populate("customer")
    .populate("invoice");

  if (!payment) throw new AppError("Payment not found", 404);

  if (payment.transactionType !== "payment") {
    throw new AppError("Receipt allowed only for payment type", 400);
  }

  await sendPaymentReceiptMail({
    customer: payment.customer,
    invoice: payment.invoice,
    payment,
  });

  return res.ok({ paymentId }, "Payment receipt email sent successfully");
});

module.exports = {
  makePayment,
  getCustomerFinanceHistory,
  getAllCustomerPayments,
  getUpcomingPayments,
  getOverduePayments,
  sendPaymentReceipt,
  
  createNoncashAdjustment,
};
