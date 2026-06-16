const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");
const EmailLog = require("../models/emailLog.model");
const catchAsync = require("../utills/catchAsync");
const AppError = require("../utills/AppError");
const Invoice = require("../models/invoice.model");
const Customer = require("../models/customer.model");
const Financial = require("../models/financial.model");
const SalesOrder = require("../models/salesOrder.model");
const Dispatch = require("../models/dispatch.model");
const { generatePDF, buildMonthlyStatementHtml } = require("../crons/monthlyStatementCron");
const { createInvoicePDF } = require("../crons/paymentReminderCron");
const {
  sendCustomersInvoiceMail,
  sendPaymentReceiptMail,
  sendDispatchMail,
  sendDispatchConfirmedMail,
  sendEmailReminder1,
  sendEmailReminder2,
  sendEmailReminder3,
} = require("../services/sendMail");

// Get all email logs with filtering options
router.get("/get-all-email-logs", catchAsync(async (req, res) => {
  let {
    page = 1,
    limit = 10,
    emailType = "",
    status = "",
    search = "", // Search in recipient email or subject
    fromDate,
    toDate,
    referenceType = "",
    referenceId = ""
  } = req.query;

  page = parseInt(page);
  limit = parseInt(limit);

  const skip = (page - 1) * limit;

  // Build filters
  const filters = {};

  if (emailType) {
    filters.emailType = emailType;
  }

  if (status) {
    filters.status = status;
  }

  if (referenceType) {
    filters.referenceType = referenceType;
  }

  if (referenceId) {
    filters.referenceId = referenceId;
  }

  // Search filter - search in recipientEmail or subject
  if (search) {
    const regex = new RegExp(search.trim(), "i");
    filters.$or = [
      { recipientEmail: regex },
      { subject: regex },
      { recipientName: regex }
    ];
  }

  // Date range filter
  if (fromDate || toDate) {
    filters.createdAt = {};
    if (fromDate) {
      filters.createdAt.$gte = new Date(fromDate);
    }
    if (toDate) {
      const endDate = new Date(toDate);
      endDate.setHours(23, 59, 59, 999); // Set to end of day
      filters.createdAt.$lte = endDate;
    }
  }
  console.log(filters);
  const [emailLogs, total] = await Promise.all([
    EmailLog.find(filters)
      .populate({
        path: 'referenceId',
        select: 'dispatchNumber salesOrderNumber invoiceNo customerName businessName'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    EmailLog.countDocuments(filters)
  ]);

  const pagination = {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };

  res.status(200).json({
    status: "success",
    data: {
      emailLogs,
      pagination
    }
  });
}));

// Get email log by ID
router.get("/:id", catchAsync(async (req, res) => {
  const { id } = req.params;

  const emailLog = await EmailLog.findById(id).populate({
    path: 'referenceId',
    select: 'dispatchNumber salesOrderNumber invoiceNo customerName businessName'
  });

  if (!emailLog) {
    throw new AppError("Email log not found", 404);
  }

  res.status(200).json({
    status: "success",
    data: {
      emailLog
    }
  });
}));

// Resend email by email log ID (specifically for dispatch emails)
router.post("/send-dispatch-email", catchAsync(async (req, res) => {
  const { id } = req.body;

  const emailLog = await EmailLog.findById(id);
  
  if (!emailLog) {
    throw new AppError("Email log not found", 404);
  }

  // Only allow resending dispatch-related emails
  if (emailLog.referenceType !== 'Dispatch') {
    throw new AppError("This resend functionality is only available for dispatch emails", 400);
  }

  try {
    // Import required models and services
    const Dispatch = require('../models/dispatch.model');
    const SalesOrder = require('../models/salesOrder.model');
    const { sendDispatchMail, sendDispatchConfirmedMail } = require('../services/sendMail');

    // Get the dispatch and related data
    const dispatch = await Dispatch.findById(emailLog.referenceId)
      .populate('salesOrder')
      .populate('customer');
    
    if (!dispatch) {
      throw new AppError("Dispatch not found", 404);
    }

    const order = await SalesOrder.findById(dispatch.salesOrder._id)
      .populate('customerId')
      .populate('items.product');
    
    if (!order) {
      throw new AppError("Sales order not found", 404);
    }

    // Send the appropriate dispatch email based on email type
    if (emailLog.emailType === 'dispatch_notification') {
      // Send to freight team
      await sendDispatchMail(emailLog.recipientEmail, dispatch, order);
    } else if (emailLog.emailType === 'dispatch_confirmed') {
      // Send to customer
      await sendDispatchConfirmedMail({
        customerEmail: emailLog.recipientEmail,
        customerName: emailLog.recipientName,
        orderNo: order.salesOrderNumber,
        invoiceNo: order.invoiceNumber || "N/A",
        dispatchDate: new Date().toDateString(),
        vehicleNo: dispatch.vehicleNo || "N/A",
        driverName: dispatch.driverName || "N/A",
      });
    } else if (emailLog.emailType === 'dispatch_delivered') {
      // Send delivery confirmation to customer
      await sendDispatchConfirmedMail({
        customerEmail: emailLog.recipientEmail,
        customerName: emailLog.recipientName,
        orderNo: order.salesOrderNumber,
        invoiceNo: order.invoiceNumber || "N/A",
        dispatchDate: new Date().toDateString(),
        vehicleNo: dispatch.vehicleNo || "N/A",
        driverName: dispatch.driverName || "N/A",
      });
    } else if (emailLog.emailType === 'dispatch_cancelled') {
      // Send cancellation notification to customer
      await sendDispatchConfirmedMail({
        customerEmail: emailLog.recipientEmail,
        customerName: emailLog.recipientName,
        orderNo: order.salesOrderNumber,
        invoiceNo: order.invoiceNumber || "N/A",
        dispatchDate: new Date().toDateString(),
        vehicleNo: "CANCELLED",
        driverName: "N/A",
      });
    }

    // Update the existing email log status
    emailLog.status = 'resent';
    emailLog.sentAt = new Date();
    emailLog.metadata = {
      ...emailLog.metadata,
      resentAt: new Date(),
      resentCount: (emailLog.metadata?.resentCount || 0) + 1
    };
    await emailLog.save();

    res.status(200).json({
      status: "success",
      message: "Dispatch email resent successfully",
      data: {
        emailLog
      }
    });
  } catch (error) {
    // Update the email log with failed status
    emailLog.status = 'failed';
    emailLog.error = error.message;
    emailLog.metadata = {
      ...emailLog.metadata,
      resentAt: new Date(),
      resentCount: (emailLog.metadata?.resentCount || 0) + 1,
      resentError: error.message
    };
    await emailLog.save();

    res.status(500).json({
      status: "error",
      message: "Failed to resend dispatch email",
      error: error.message
    });
  }
}));

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Generate Email HTML safely for preview/download
// ─────────────────────────────────────────────────────────────────────────────
async function generateEmailHTML(id) {
  const emailLog = await EmailLog.findById(id);
  if (!emailLog) throw new AppError("Email log not found", 404);

  const { emailType, recipientEmail, recipientName, referenceId,createdAt } = emailLog;
  let htmlContent = "";

  if (emailType === "invoice_created") {
    const invoice = await Invoice.findById(referenceId);
    if (!invoice) throw new AppError("Invoice not found", 404);
    const order = await SalesOrder.findById(invoice.order).populate("customerId").populate("items.product");
    if (!order) throw new AppError("Sales order not found", 404);
    htmlContent = await sendCustomersInvoiceMail(recipientEmail, invoice, order, null, true);

  } else if (emailType === "payment_receipt") {
    const invoice = await Invoice.findById(referenceId);
    if (!invoice) throw new AppError("Invoice not found", 404);
    const customer = await Customer.findById(invoice.customer);
    if (!customer) throw new AppError("Customer not found", 404);
    const payment = await Financial.findOne({ invoice: invoice._id, transactionType: "payment" }).sort({ createdAt: -1 });
    if (!payment) throw new AppError("Payment record not found", 404);
    htmlContent = await sendPaymentReceiptMail({ customer, invoice, payment }, true);

  } else if (emailType === "monthly_statement") {
    const customer = await Customer.findById(referenceId).lean();
    if (!customer) throw new AppError("Customer not found", 404);

    const month = emailLog.metadata?.month || new Date().getMonth();
    const year = emailLog.metadata?.year || new Date().getFullYear();
    const prevMonthStart = new Date(year, month - 1, 1);
    const prevMonthEnd = new Date(year, month, 0);

    const invoices = await Invoice.find({
      customer: customer._id,
      invoiceDate: { $gte: prevMonthStart, $lte: prevMonthEnd },
    }).populate({ path: "order", populate: { path: "items.product", select: "productCode productName description" } }).lean();

    const formattedAddress = customer.correspondenceAddress 
      ? [customer.correspondenceAddress.line1, customer.correspondenceAddress.line2, customer.correspondenceAddress.city, customer.correspondenceAddress.state, customer.correspondenceAddress.postcode].filter(Boolean).join(', ')
      : '';

    const formattedInvoices = invoices.map(inv => {
      const orderItem = inv.order?.items?.[0];
      const product = orderItem?.product;
      let amountPaid = inv.isPaid ? (inv.amountPaid || inv.gross || 0) : (inv.amountPaid || 0);
      let amountDue = inv.isPaid ? 0 : (inv.amountDue !== undefined ? inv.amountDue : (inv.gross || 0) - amountPaid);
      return {
        invoiceNo: inv.invoiceNo, invoiceDate: inv.invoiceDate, productCode: product?.productCode || "N/A", description: product?.description || "N/A", qty: orderItem?.qty || 0, qtyType: orderItem?.qtyType, costPerPiece: orderItem?.unitPrice || 0, net: inv.net || 0, vat: inv.vat || 0, gross: inv.gross || 0, isPaid: inv.isPaid || false, amountPaid, amountDue,
      };
    });

    const customerData = { customerCode: customer.customerCode, businessName: customer.businessName, email: customer.email, address: formattedAddress };
    
    // For preview, we don't strictly need the base64 logo inline unless we want it to render correctly in browser. Let's try base64 for preview.
    const logoPath = path.join(__dirname, '../../uploads/stbsPdfLogo.png');
    let logoBase64 = '';
    try {
      if (fs.existsSync(logoPath)) {
        logoBase64 = `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`;
      }
    } catch(e) {}

    htmlContent = await buildMonthlyStatementHtml({
      customerName: customer.name || customer.businessName || "Customer",
      customerData, formattedInvoices, month, year,
      logoHtml: logoBase64 ? `<div class="logo"><img src="${logoBase64}" alt="STBS Logo" style="max-width:200px;" /></div>` : ''
    });

  } else if (emailType === "payment_reminder_1") {
    const invoice = await Invoice.findById(referenceId);
    if (!invoice) throw new AppError("Invoice not found", 404);
    const customer = await Customer.findById(invoice.customer);
    htmlContent = await sendEmailReminder1(customer, invoice, null, true);

  } else if (emailType === "payment_reminder_2") {
    const invoice = await Invoice.findById(referenceId);
    if (!invoice) throw new AppError("Invoice not found", 404);
    const customer = await Customer.findById(invoice.customer);
    const sevenDaysAgo = new Date(createdAt - 7 * 24 * 60 * 60 * 1000).toLocaleDateString("en-GB");
    htmlContent = await sendEmailReminder2(customer, invoice, sevenDaysAgo, null, true);

  } else if (emailType === "payment_reminder_3") {
    const invoice = await Invoice.findById(referenceId);
    if (!invoice) throw new AppError("Invoice not found", 404);
    const customer = await Customer.findById(invoice.customer);
    htmlContent = await sendEmailReminder3(customer, invoice, null, true);

  } else if (["dispatch_notification", "dispatch_confirmed", "dispatch_delivered", "dispatch_cancelled"].includes(emailType)) {
    const dispatch = await Dispatch.findById(referenceId).populate("salesOrder").populate("customer");
    if (!dispatch) throw new AppError("Dispatch not found", 404);
    const order = await SalesOrder.findById(dispatch.salesOrder._id).populate("customerId").populate("items.product");
    if (!order) throw new AppError("Sales order not found", 404);

    if (emailType === "dispatch_notification") {
      htmlContent = await sendDispatchMail(recipientEmail, dispatch, order, true);
    } else {
      htmlContent = await sendDispatchConfirmedMail({
        customerEmail: recipientEmail, customerName: recipientName, orderNo: order.salesOrderNumber, invoiceNo: order.invoiceNumber || "N/A", dispatchDate: new Date().toDateString(), vehicleNo: emailType === "dispatch_cancelled" ? "CANCELLED" : (dispatch.vehicleNo || "N/A"), driverName: dispatch.driverName || "N/A",
      }, true);
    }
  } else {
    throw new AppError(`View not supported for emailType: ${emailType}`, 400);
  }

  return { htmlContent, emailLog };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /view/:id — View HTML of an email log
// ─────────────────────────────────────────────────────────────────────────────
router.get("/view/:id", catchAsync(async (req, res) => {
  const { htmlContent } = await generateEmailHTML(req.params.id);
  res.status(200).json({ status: "success", data: { html: htmlContent } });
}));

// ─────────────────────────────────────────────────────────────────────────────
// GET /download/:id — Download PDF of an email log
// ─────────────────────────────────────────────────────────────────────────────
router.get("/download/:id", catchAsync(async (req, res) => {
  const { htmlContent, emailLog } = await generateEmailHTML(req.params.id);
  const pdfBuffer = await generatePDF(htmlContent, null, {
    format: 'A4',
    // Monthly statement is usually landscape, others standard portrait
    landscape: emailLog.emailType === 'monthly_statement'
  });

  const filename = `${emailLog.emailType}_${emailLog.recipientName}099999.pdf`;
  
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(pdfBuffer);
}));

// ─────────────────────────────────────────────────────────────────────────────
// UNIVERSAL RESEND — handles ALL emailType values
// ─────────────────────────────────────────────────────────────────────────────
router.post("/resend", catchAsync(async (req, res) => {
  const { id } = req.body;
  if (!id) throw new AppError("EmailLog id is required", 400);

  const emailLog = await EmailLog.findById(id);
  if (!emailLog) throw new AppError("Email log not found", 404);

  const {
    emailType,
    recipientEmail,
    recipientName,
    referenceId,
    referenceType,
    createdAt
  } = emailLog;

  try {
    // ── INVOICE_CREATED ───────────────────────────────────────────────
    if (emailType === "invoice_created") {
      const invoice = await Invoice.findById(referenceId);
      if (!invoice) throw new AppError("Invoice not found", 404);

      const order = await SalesOrder.findById(invoice.order)
        .populate("customerId")
        .populate("items.product");
      if (!order) throw new AppError("Sales order not found", 404);

      const pdfPath = await createInvoicePDF(invoice);
      await sendCustomersInvoiceMail(recipientEmail, invoice, order, pdfPath);
      if (pdfPath && fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);

    // ── PAYMENT_RECEIPT ───────────────────────────────────────────────
    } else if (emailType === "payment_receipt") {
      const invoice = await Invoice.findById(referenceId);
      if (!invoice) throw new AppError("Invoice not found", 404);

      const customer = await Customer.findById(invoice.customer);
      if (!customer) throw new AppError("Customer not found", 404);

      const payment = await Financial.findOne({
        invoice: invoice._id,
        transactionType: "payment",
      }).sort({ createdAt: -1 });
      if (!payment) throw new AppError("Payment record not found", 404);

      await sendPaymentReceiptMail({ customer, invoice, payment });

    // ── MONTHLY STATEMENT ─────────────────────────────────────────────
    } else if (emailType === "monthly_statement") {
      const customer = await Customer.findById(referenceId).lean();
      if (!customer) throw new AppError("Customer not found", 404);

      const today = new Date();
      const prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const prevMonthEnd   = new Date(today.getFullYear(), today.getMonth(), 0);
      const month = prevMonthStart.getMonth() + 1;
      const year  = prevMonthStart.getFullYear();
      const monthName = new Date(year, month - 1).toLocaleString("default", { month: "long", year: "numeric" });

      const invoices = await Invoice.find({
        customer: customer._id,
        invoiceDate: { $gte: prevMonthStart, $lte: prevMonthEnd },
      }).populate({ path: "order", populate: { path: "items.product", select: "productCode productName description" } }).lean();

      if (invoices.length === 0) throw new AppError("No invoices found for last month", 404);

      const formattedAddress = customer.correspondenceAddress 
        ? [
            customer.correspondenceAddress.line1,
            customer.correspondenceAddress.line2,
            customer.correspondenceAddress.city,
            customer.correspondenceAddress.state,
            customer.correspondenceAddress.postcode
          ].filter(Boolean).join(', ')
        : '';

      const formattedInvoices = invoices.map(inv => {
        const orderItem = inv.order?.items?.[0]; // Get first item
        const product = orderItem?.product;

        // Calculate amounts based on isPaid status exactly like cron
        let amountPaid = 0;
        let amountDue = 0;
        
        if (inv.isPaid) {
          amountPaid = inv.amountPaid || inv.gross || 0;
          amountDue = 0;
        } else {
          amountPaid = inv.amountPaid || 0;
          amountDue = inv.amountDue !== undefined ? inv.amountDue : (inv.gross || 0) - amountPaid;
        }

        return {
          invoiceNo: inv.invoiceNo,
          invoiceDate: inv.invoiceDate,
          productCode: product?.productCode || "N/A",
          description: product?.description || "N/A",
          qty: orderItem?.qty || 0,
          qtyType: orderItem?.qtyType,
          costPerPiece: orderItem?.unitPrice || 0,
          net: inv.net || 0,
          vat: inv.vat || 0,
          gross: inv.gross || 0,
          isPaid: inv.isPaid || false,
          amountPaid: amountPaid,
          amountDue: amountDue,
        };
      });
       // Get absolute logo path and convert to base64
              const logoPath = path.join(__dirname, '../../uploads/stbsPdfLogo.png');
              let logoBase64 = '';
              let logoForEmail = 'cid:stbs-logo'; // For email use CID
              try {
                const logoBuffer = fs.readFileSync(logoPath);
                logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
              } catch (logoError) {
                console.warn('⚠️ Logo not found, continuing without logo');
              }
      const customerData = {
        customerCode: customer.customerCode,
        businessName: customer.businessName,
        email: customer.email,
        address: formattedAddress,
      };
      console.log(formattedInvoices);
      const totalDue  = formattedInvoices.reduce((s, i) => s + (i.amountDue  || 0), 0);
      const pdfHtml = await buildMonthlyStatementHtml({
        customerName: customer.name || customer.businessName || "Customer",
        customerData, 
        formattedInvoices, 
        month, 
        year, 
        logoHtml: `<div class="logo"><img src="${logoBase64}" alt="STBS Logo" /></div>`
      });

      const emailHtml = await buildMonthlyStatementHtml({
        customerName: customer.name || customer.businessName || "Customer",
        customerData, 
        formattedInvoices, 
        month, 
        year, 
        logoHtml: `<div class="logo"><img src="cid:stbs-logo" alt="STBS Logo" /></div>`
      });

      const subject = `Monthly Invoice Statement - ${monthName}`;
      const pdfDir = path.join(__dirname, "../../uploads/statements");
      if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });
      const pdfFileName = `resend_statement_${customer.customerCode || "CUST"}_${year}_${String(month).padStart(2, "0")}.pdf`;
      const pdfFilePath = path.join(pdfDir, pdfFileName);

      await generatePDF(pdfHtml, pdfFilePath);

      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com", port: 587, secure: false,
        auth: { user: process.env.SMTP_USERNAME, pass: process.env.SMTP_PASSWORD },
        tls: { rejectUnauthorized: false },
      });
      await transporter.sendMail({
        from: `"Monthly Statements" <${process.env.SMTP_USERNAME}>`,
        to: customer.email, subject, html: emailHtml,
        attachments: [
          { filename: pdfFileName, path: pdfFilePath, contentType: "application/pdf" },
          { filename: 'stbsPdfLogo.png', path: logoPath, cid: 'stbs-logo' }
        ],
      });

      if (fs.existsSync(pdfFilePath)) fs.unlink(pdfFilePath, () => {});

    // ── PAYMENT REMINDERS ─────────────────────────────────────────────
    } else if (emailType === "payment_reminder_1") {
      const invoice = await Invoice.findById(referenceId);
      if (!invoice) throw new AppError("Invoice not found", 404);
      const customer = await Customer.findById(invoice.customer);
      const pdfPath = await createInvoicePDF(invoice);
      await sendEmailReminder1(customer, invoice, pdfPath);
      if (pdfPath && fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);

    } else if (emailType === "payment_reminder_2") {
      const invoice = await Invoice.findById(referenceId);
      if (!invoice) throw new AppError("Invoice not found", 404);
      const customer = await Customer.findById(invoice.customer);
      const sevenDaysAgo = new Date(createdAt - 7 * 24 * 60 * 60 * 1000).toLocaleDateString("en-GB");
      const pdfPath = await createInvoicePDF(invoice);
      await sendEmailReminder2(customer, invoice, sevenDaysAgo, pdfPath);
      if (pdfPath && fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);

    } else if (emailType === "payment_reminder_3") {
      const invoice = await Invoice.findById(referenceId);
      if (!invoice) throw new AppError("Invoice not found", 404);
      const customer = await Customer.findById(invoice.customer);
      const pdfPath = await createInvoicePDF(invoice);
      await sendEmailReminder3(customer, invoice, pdfPath);
      if (pdfPath && fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);

    // ── DISPATCH TYPES ────────────────────────────────────────────────
    } else if (["dispatch_notification", "dispatch_confirmed", "dispatch_delivered", "dispatch_cancelled"].includes(emailType)) {
      const dispatch = await Dispatch.findById(referenceId).populate("salesOrder").populate("customer");
      if (!dispatch) throw new AppError("Dispatch not found", 404);

      const order = await SalesOrder.findById(dispatch.salesOrder._id)
        .populate("customerId")
        .populate("items.product");
      if (!order) throw new AppError("Sales order not found", 404);

      if (emailType === "dispatch_notification") {
        await sendDispatchMail(recipientEmail, dispatch, order);
      } else {
        await sendDispatchConfirmedMail({
          customerEmail: recipientEmail,
          customerName: recipientName,
          orderNo: order.salesOrderNumber,
          invoiceNo: order.invoiceNumber || "N/A",
          dispatchDate: new Date().toDateString(),
          vehicleNo: emailType === "dispatch_cancelled" ? "CANCELLED" : (dispatch.vehicleNo || "N/A"),
          driverName: dispatch.driverName || "N/A",
        });
      }

    } else {
      throw new AppError(`Resend not supported for emailType: ${emailType}`, 400);
    }

    // ── Update log ────────────────────────────────────────────────────
    emailLog.status = "resent";
    emailLog.sentAt = new Date();
    emailLog.error = null;
    emailLog.metadata = {
      ...emailLog.metadata,
      resentAt: new Date(),
      resentCount: (emailLog.metadata?.resentCount || 0) + 1,
    };
    await emailLog.save();

    return res.status(200).json({
      status: "success",
      message: "Email resent successfully",
      data: { emailLog },
    });

  } catch (error) {
    emailLog.status = "failed";
    emailLog.error = error.message;
    emailLog.metadata = {
      ...emailLog.metadata,
      resentAt: new Date(),
      resentCount: (emailLog.metadata?.resentCount || 0) + 1,
      resentError: error.message,
    };
    await emailLog.save();

    return res.status(500).json({
      status: "error",
      message: "Failed to resend email",
      error: error.message,
    });
  }
}));

// Get email logs by reference (e.g., for a specific invoice or dispatch)
// router.get("/reference/:referenceType/:referenceId", catchAsync(async (req, res) => {
//   const { referenceType, referenceId } = req.params;
//   let { page = 1, limit = 10, emailType = "", status = "" } = req.query;

//   page = parseInt(page);
//   limit = parseInt(limit);
//   const skip = (page - 1) * limit;

//   const filters = {
//     referenceType,
//     referenceId
//   };

//   if (emailType) {
//     filters.emailType = emailType;
//   }

//   if (status) {
//     filters.status = status;
//   }

//   const [emailLogs, total] = await Promise.all([
//     EmailLog.find(filters)
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit),
//     EmailLog.countDocuments(filters)
//   ]);

//   const pagination = {
//     total,
//     page,
//     limit,
//     totalPages: Math.ceil(total / limit)
//   };

//   res.status(200).json({
//     status: "success",
//     data: {
//       emailLogs,
//       pagination
//     }
//   });
// }));

// Manually send a payment reminder email (same logic as cron)
router.post("/send-payment-reminder", catchAsync(async (req, res) => {
  const { invoiceId, reminderType = 'payment_reminder_1' } = req.body;

  // Validate inputs
  if (!invoiceId) {
    throw new AppError("Invoice ID is required", 400);
  }

  if (!['payment_reminder_1', 'payment_reminder_2', 'payment_reminder_3'].includes(reminderType)) {
    throw new AppError("Invalid reminder type. Must be one of: payment_reminder_1, payment_reminder_2, payment_reminder_3", 400);
  }

  // Import required models
  const Financial = require('../models/financial.model');
  const Invoice = require('../models/invoice.model');
  const Customer = require('../models/customer.model');
  const { sendEmailReminder1, sendEmailReminder2, sendEmailReminder3 } = require('../services/sendMail');
  
  // Get the invoice and related data
  const invoice = await Invoice.findById(invoiceId).populate('order');
  if (!invoice) {
    throw new AppError("Invoice not found", 404);
  }

  // Get financial record for this invoice
  const financialRecord = await Financial.findOne({ invoice: invoiceId }).populate('customer');
  if (!financialRecord) {
    throw new AppError("Financial record not found for this invoice", 404);
  }

  const customer = financialRecord.customer;
  if (!customer) {
    throw new AppError("Customer not found", 404);
  }

  try {
    // Generate invoice PDF for attachment
    let pdfPath = null;
    try {
      const { createInvoicePDF } = require('../crons/paymentReminderCron');
      if (typeof createInvoicePDF === 'function') {
        pdfPath = await createInvoicePDF(invoice);
      }
    } catch (pdfError) {
      console.error('PDF generation failed for manual reminder:', invoice.invoiceNo, pdfError.message);
    }

    // Check if email log already exists for this invoice and reminder type
    let emailLog = await EmailLog.findOne({
      referenceId: invoice._id,
      emailType: reminderType
    });
    
    if (emailLog) {
      // Update existing email log
      emailLog.status = 'pending';
      emailLog.sentAt = null;
      emailLog.error = null;
      emailLog.metadata = {
        ...emailLog.metadata,
        manualTrigger: true,
        triggeredAt: new Date(),
        retryCount: (emailLog.metadata?.retryCount || 0) + 1
      };
      await emailLog.save();
    } else {
      // Create new email log if it doesn't exist
      emailLog = await EmailLog.create({
        emailType: reminderType,
        referenceType: 'Invoice',
        referenceId: invoice._id,
        recipientEmail: customer.email,
        recipientName: customer.businessName || customer.name,
        subject: getReminderSubject(reminderType, invoice.invoiceNo),
        body: getReminderBody(reminderType, invoice.invoiceNo, invoice.gross),
        status: 'pending',
        metadata: {
          customerId: customer._id,
          invoiceAmount: invoice.gross,
          dueDate: financialRecord.dueDate,
          manualTrigger: true,
          triggeredAt: new Date()
        }
      });
    }

    // Send the appropriate reminder based on type
    let sendResult;
    switch (reminderType) {
      case 'payment_reminder_1':
        sendResult = await sendEmailReminder1(customer, invoice, pdfPath);
        break;
      case 'payment_reminder_2':
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString("en-GB");
        sendResult = await sendEmailReminder2(customer, invoice, sevenDaysAgo, pdfPath);
        break;
      case 'payment_reminder_3':
        sendResult = await sendEmailReminder3(customer, invoice, pdfPath);
        break;
    }

    // Update email log status to sent
    emailLog.status = 'resent';
    emailLog.sentAt = new Date();
    await emailLog.save();

    // Cleanup PDF if it was created
    if (pdfPath && require('fs').existsSync(pdfPath)) {
      require('fs').unlinkSync(pdfPath);
    }

    res.status(200).json({
      status: "success",
      message: `Payment reminder ${reminderType} sent successfully`,
      data: {
        emailLog,
        sendResult
      }
    });
  } catch (error) {
    // Update the email log that was being processed
    const emailLog = await EmailLog.findOne({
      referenceId: invoice._id,
      emailType: reminderType
    });
    
    if (emailLog) {
      emailLog.status = 'failed';
      emailLog.error = error.message;
      await emailLog.save();
    }

    // Cleanup PDF if it was created
    if (pdfPath && require('fs').existsSync(pdfPath)) {
      require('fs').unlinkSync(pdfPath);
    }

    res.status(500).json({
      status: "error",
      message: "Failed to send payment reminder",
      error: error.message
    });
  }
}));

// Helper functions
function getReminderSubject(reminderType, invoiceNo) {
  switch (reminderType) {
    case 'payment_reminder_1':
      return `Reminder - Invoice ${invoiceNo}`;
    case 'payment_reminder_2':
      return `Second Reminder – Invoice ${invoiceNo}`;
    case 'payment_reminder_3':
      return "URGENT REMINDER  FINAL NOTICE";
    default:
      return `Payment Reminder - Invoice ${invoiceNo}`;
  }
}

function getReminderBody(reminderType, invoiceNo, amount) {
  switch (reminderType) {
    case 'payment_reminder_1':
      return `First payment reminder for Invoice ${invoiceNo} with amount ${amount}`;
    case 'payment_reminder_2':
      return `Second payment reminder for Invoice ${invoiceNo} with amount ${amount}`;
    case 'payment_reminder_3':
      return `Final payment reminder for Invoice ${invoiceNo} with amount ${amount}`;
    default:
      return `Payment reminder for Invoice ${invoiceNo} with amount ${amount}`;
  }
}

module.exports = router;