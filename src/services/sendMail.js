const nodemailer = require("nodemailer");

// ── Hardcoded templates (fallback if DB template missing) ─────────────────────
const { ForgetPasswordTemplate } = require("../emailTemplates/forgetPasswordTemplate");
const { dispatchToFreightTeamTemplate } = require("../emailTemplates/dispatchToFreightTeamTemplate");
const { CreditInvoiceTemplate } = require("../emailTemplates/ccCustomerEmailTemplate");
const { ProformaInvoiceTemplate } = require("../emailTemplates/pcCustomerEmailTemplate");
const { EmailReminder1 } = require("../emailTemplates/firstReminderTemplate");
const { EmailReminder2 } = require("../emailTemplates/secondReminderTemplate");
const { EmailReminder3 } = require("../emailTemplates/thirdReminderTemplate");
const { paymentReceiptTemplate } = require("../emailTemplates/paymentReceiptTemplate");
const { lowStockTemplate } = require("../emailTemplates/lowStockTemplate ");
const { dispatchConfirmedTemplate } = require("../emailTemplates/dispatchConfirmedTemplate");

// ── Shared transporter ────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USERNAME,
    pass: process.env.SMTP_PASSWORD,
  },
  tls: { rejectUnauthorized: false },
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Fetch HTML from DB EmailTemplate and replace {{variable}} placeholders
// Falls back to the provided fallbackHtml if DB template is missing.
// ─────────────────────────────────────────────────────────────────────────────
async function getTemplateHtml(key, variables = {}, fallbackHtml = "") {
  try {
    const EmailTemplate = require("../models/emailTemplate.model");
    const tmpl = await EmailTemplate.findOne({ key }).lean();

    if (!tmpl) {
      console.warn(`[sendMail] No DB template found for key="${key}". Using fallback.`);
      return fallbackHtml;
    }

    // Replace all {{variable}} placeholders with actual values
    let html = tmpl.htmlContent;
    for (const [varKey, value] of Object.entries(variables)) {
      const safeValue = value !== undefined && value !== null ? String(value) : "";
      // Replace {{varKey}} globally (handles {{customer.name}} style keys too)
      html = html.split(`{{${varKey}}}`).join(safeValue);
    }
    return html;
  } catch (err) {
    console.error(`[sendMail] getTemplateHtml error for key="${key}":`, err.message);
    return fallbackHtml;
  }
}

function pluralize(value, singular, plural = `${singular}s`) {
  return Number(value) === 1 ? singular : plural;
}

function formatInvoiceItemQty(item) {
  const qty = Number(item?.qty) || 0;
  const qtyType = item?.qtyType === "board" ? "board" : "pallet";
  const boardsPerPallet = Number(item?.product?.qtyPerPallet) || 0;

  if (qtyType === "pallet") {
    const palletText = `${qty} ${pluralize(qty, "Pallet")}`;
    if (boardsPerPallet > 0) {
      const totalBoards = qty * boardsPerPallet;
      return `${palletText} (${totalBoards} ${pluralize(totalBoards, "Board")})`;
    }
    return palletText;
  }

  const boardText = `${qty} ${pluralize(qty, "Board")}`;

  if (boardsPerPallet > 0 && qty >= boardsPerPallet) {
    const fullPallets = Math.floor(qty / boardsPerPallet);
    const remainingBoards = qty % boardsPerPallet;

    if (remainingBoards > 0) {
      return `${boardText} (${fullPallets} ${pluralize(fullPallets, "Pallet")}, ${remainingBoards} ${pluralize(remainingBoards, "Board")})`;
    }

    return `${boardText} (${fullPallets} ${pluralize(fullPallets, "Pallet")})`;
  }

  return boardText;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. FORGET PASSWORD
// ─────────────────────────────────────────────────────────────────────────────
module.exports.forgetPasswordMail = async (email, name, link, returnPreview = false) => {
  const fallback = ForgetPasswordTemplate(name, link);

  const html = await getTemplateHtml("forget_password", {
    name,
    forgetPasswordLink: link,
  }, fallback);

  if (returnPreview) return html;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_USERNAME,
      to: email,
      subject: "Reset Your Password",
      text: "Please reset your password on the link below.",
      html,
    });
  } catch (error) {
    console.error("[sendMail] forgetPasswordMail error:", error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. DISPATCH TO FREIGHT TEAM
// ─────────────────────────────────────────────────────────────────────────────
module.exports.sendDispatchMail = async (warehouseEmail, dispatch, order, returnPreview = false) => {
  const customer = order.customerId;
  const items = order.items.map((i) => ({
    qty: Number(i.qty) || 0,
    qtyLabel: formatInvoiceItemQty(i),
    productName: i.product?.productName || "N/A",
  }));

  const itemRowsHtml = items
    .map(
      (i) => `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${i.qtyLabel || i.qty}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${i.productName}</td>
        </tr>
      `,
    )
    .join("");

  // Build address string
  const addr = customer.deliveryAddress
    ? `${customer.deliveryAddress.line1 || ""}, ${customer.deliveryAddress.city || ""}`
    : "";

  const fallback = dispatchToFreightTeamTemplate(
    dispatch.dispatchNumber,
    customer,
    items,
    order.deliveryMethod,
    dispatch.notes
  );

  let html = await getTemplateHtml("dispatch_freight_team", {
    dispatchNumber: dispatch.dispatchNumber,
    "customer.businessName": customer.businessName,
    "customer.deliveryAddress": addr,
    "customer.primaryPhone": customer.primaryPhone || "N/A",
    "customer.secondaryPhone": customer.secondaryPhone || "N/A",
    qty: items[0]?.qtyLabel || "",
    productName: items[0]?.productName || "",
    itemRowsHtml,
    deliveryMethod: order.deliveryMethod?.toUpperCase() || "",
    notes: dispatch.notes || "N/A",
  }, fallback);

  // Backward-compatibility for DB templates that still contain one static row.
  html = html.replace(/<tbody[^>]*>[\s\S]*?<\/tbody>/i, `<tbody>${itemRowsHtml}</tbody>`);

  if (returnPreview) return html;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_USERNAME,
      to: warehouseEmail,
      subject: `Dispatch Request – ${dispatch.dispatchNumber}`,
      text: "Please arrange dispatch for this order.",
      html,
    });
  } catch (err) {
    console.error("[sendMail] sendDispatchMail error:", err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. CUSTOMER INVOICE (CC = Credit / PC = Proforma)
// ─────────────────────────────────────────────────────────────────────────────
module.exports.sendCustomersInvoiceMail = async (email, invoice, order, pdfPath = null, returnPreview = false) => {
  const customer = order.customerId;
  const items = order.items.map((i) => ({
    qty: Number(i.qty) || 0,
    qtyLabel: formatInvoiceItemQty(i),
    productName: i.product?.productName || "N/A",
    unitPrice: Number(i.unitPrice) || 0,
    net: Number(i.net) || 0,
    vat: Number(i.vat) || 0,
    gross: Number(i.gross) || 0,
  }));

  const totals = {
    totalNet: invoice.net,
    totalVat: invoice.vat,
    totalGross: invoice.gross,
  };

  const isPC = customer.customerType === "PC";
  const templateKey = isPC ? "pc_customer_invoice" : "cc_customer_invoice";

  const fallback = isPC
    ? ProformaInvoiceTemplate(invoice.invoiceNo, invoice.createdAt, customer, items, totals, order.deliveryMethod, order)
    : CreditInvoiceTemplate(invoice.invoiceNo, invoice.createdAt, customer, items, totals, order.deliveryMethod, order);

  // For items table: build a simple HTML rows string for multi-item orders
  const itemRowsHtml = items.map((i) => `
    <tr>
      <td style="padding:8px;border:1px solid #ccc;">${i.qtyLabel || i.qty}</td>
      <td style="padding:8px;border:1px solid #ccc;">${i.productName}</td>
      <td style="padding:8px;border:1px solid #ccc;">£${Number(i.unitPrice).toFixed(2)}</td>
      <td style="padding:8px;border:1px solid #ccc;">£${Number(i.net).toFixed(2)}</td>
      <td style="padding:8px;border:1px solid #ccc;">£${Number(i.vat).toFixed(2)}</td>
      <td style="padding:8px;border:1px solid #ccc;">£${Number(i.gross).toFixed(2)}</td>
    </tr>`).join("");

  const addr = customer.correspondenceAddress
    ? `${customer.correspondenceAddress.line1 || ""}, ${customer.correspondenceAddress.city || ""}`
    : customer.address || "";

  let html = await getTemplateHtml(templateKey, {
    invoiceNo: invoice.invoiceNo,
    invoiceDate: new Date(invoice.createdAt).toLocaleDateString("en-GB"),
    "customer.businessName": customer.businessName,
    "customer.correspondenceAddress": addr,
    "customer.postcode": customer.correspondenceAddress?.postcode || customer.postcode || "",
    "customer.primaryPhone": customer.primaryPhone || "N/A",
    "customer.address": addr,
    "customer.phone": customer.primaryPhone || "N/A",
    "order.salesOrderNumber": order.salesOrderNumber,
    deliveryMethod: order.deliveryMethod?.toUpperCase() || "",
    // Single-item shorthand (for templates with single row)
    qty: items[0]?.qtyLabel || "",
    productName: items[0]?.productName || "",
    unitPrice: Number(items[0]?.unitPrice || 0).toFixed(2),
    net: Number(items[0]?.net || 0).toFixed(2),
    vat: Number(items[0]?.vat || 0).toFixed(2),
    gross: Number(items[0]?.gross || 0).toFixed(2),
    itemRowsHtml,
    // Totals
    "totals.totalNet": Number(totals.totalNet || 0).toFixed(2),
    "totals.totalVat": Number(totals.totalVat || 0).toFixed(2),
    "totals.totalGross": Number(totals.totalGross || 0).toFixed(2),
  }, fallback);

  // Backward-compatibility for legacy DB templates that still have one static row.
  html = html.replace(/<tbody[^>]*>[\s\S]*?<\/tbody>/i, `<tbody>${itemRowsHtml}</tbody>`);

  if (returnPreview) return html;

  const mailOptions = {
    from: process.env.SMTP_USERNAME,
    to: email,
    subject: isPC
      ? `Proforma Invoice ${invoice.invoiceNo}`
      : `VAT Invoice ${invoice.invoiceNo}`,
    html,
  };

  if (pdfPath) {
    mailOptions.attachments = [{
      filename: `Invoice_${invoice.invoiceNo}.pdf`,
      path: pdfPath,
      contentType: "application/pdf",
    }];
  }

  await transporter.sendMail(mailOptions);
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. PAYMENT REMINDER 1
// ─────────────────────────────────────────────────────────────────────────────
module.exports.sendEmailReminder1 = async (customer, invoice, pdfPath = null, returnPreview = false) => {
  const fallback = EmailReminder1(customer.businessName, invoice.invoiceNo, invoice.gross);

  const html = await getTemplateHtml("payment_reminder_1", {
    customerName: customer.businessName,
    invoiceNo: invoice.invoiceNo,
    amount: Number(invoice.gross || 0).toFixed(2),
  }, fallback);

  if (returnPreview) return html;

  const mailOptions = {
    from: process.env.SMTP_USERNAME,
    to: customer.email,
    subject: `Reminder – Invoice ${invoice.invoiceNo}`,
    html,
  };

  if (pdfPath) {
    mailOptions.attachments = [{
      filename: `Invoice_${invoice.invoiceNo}.pdf`,
      path: pdfPath,
      contentType: "application/pdf",
    }];
  }

  return transporter.sendMail(mailOptions);
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. PAYMENT REMINDER 2
// ─────────────────────────────────────────────────────────────────────────────
module.exports.sendEmailReminder2 = async (customer, invoice, dueDate, pdfPath = null, returnPreview = false) => {
  const fallback = EmailReminder2(customer.businessName, invoice.invoiceNo, invoice.gross, dueDate);

  const html = await getTemplateHtml("payment_reminder_2", {
    customerName: customer.businessName,
    invoiceNo: invoice.invoiceNo,
    amount: Number(invoice.gross || 0).toFixed(2),
    firstReminderDate: dueDate,
  }, fallback);

  if (returnPreview) return html;

  const mailOptions = {
    from: process.env.SMTP_USERNAME,
    to: customer.email,
    subject: `Second Reminder – Invoice ${invoice.invoiceNo}`,
    html,
  };

  if (pdfPath) {
    mailOptions.attachments = [{
      filename: `Invoice_${invoice.invoiceNo}.pdf`,
      path: pdfPath,
      contentType: "application/pdf",
    }];
  }

  return transporter.sendMail(mailOptions);
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. PAYMENT REMINDER 3 (FINAL)
// ─────────────────────────────────────────────────────────────────────────────
module.exports.sendEmailReminder3 = async (customer, invoice, pdfPath = null, returnPreview = false) => {
  const fallback = EmailReminder3(customer.businessName, invoice.invoiceNo, invoice.paymentDueDate, invoice.gross);

  const html = await getTemplateHtml("payment_reminder_3", {
    customerName: customer.businessName,
    invoiceNo: invoice.invoiceNo,
    amount: Number(invoice.gross || 0).toFixed(2),
    finalDate: invoice.paymentDueDate
      ? new Date(invoice.paymentDueDate).toLocaleDateString("en-GB")
      : "",
  }, fallback);

  if (returnPreview) return html;

  const mailOptions = {
    from: process.env.SMTP_USERNAME,
    to: customer.email,
    subject: "URGENT – FINAL NOTICE",
    html,
  };

  if (pdfPath) {
    mailOptions.attachments = [{
      filename: `Invoice_${invoice.invoiceNo}.pdf`,
      path: pdfPath,
      contentType: "application/pdf",
    }];
  }

  return transporter.sendMail(mailOptions);
};

// ─────────────────────────────────────────────────────────────────────────────
// 7. DISPATCH CONFIRMED (to customer)
// ─────────────────────────────────────────────────────────────────────────────
module.exports.sendDispatchConfirmedMail = async ({
  customerEmail,
  customerName,
  orderNo,
  invoiceNo,
  dispatchDate,
  vehicleNo,
  driverName,
}, returnPreview = false) => {
  const fallback = dispatchConfirmedTemplate({
    customerName,
    orderNo,
    invoiceNo,
    dispatchDate,
    vehicleNo,
    driverName,
  });

  const html = await getTemplateHtml("dispatch_confirmed", {
    customerName,
    orderNo,
    invoiceNo,
    dispatchDate,
    vehicleNo,
    driverName,
  }, fallback);

  if (returnPreview) return html;

  await transporter.sendMail({
    from: process.env.SMTP_USERNAME,
    to: customerEmail,
    subject: `Your Order ${orderNo} Has Been Dispatched`,
    html,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// 8. PAYMENT RECEIPT
// ─────────────────────────────────────────────────────────────────────────────
module.exports.sendPaymentReceiptMail = async ({ customer, invoice, payment }, returnPreview = false) => {
  const fallback = paymentReceiptTemplate({ customer, invoice, payment });

  const html = await getTemplateHtml("payment_receipt", {
    "customer.businessName": customer.businessName,
    "invoice.invoiceNo": invoice ? invoice.invoiceNo : "N/A",
    "invoice.gross": invoice ? Number(invoice.gross || 0).toFixed(2) : "0.00",
    "invoice.amountDue": invoice ? Number(invoice.amountDue || 0).toFixed(2) : "0.00",
    "payment.credit": Number(payment.credit || 0).toFixed(2),
    "payment.paymentMethod": payment.paymentMethod || "",
    "payment.referenceNo": payment.referenceNo || "N/A",
    "payment.transactionDate": payment.transactionDate
      ? new Date(payment.transactionDate).toDateString()
      : "",
  }, fallback);

  if (returnPreview) return html;

  await transporter.sendMail({
    from: process.env.SMTP_USERNAME,
    to: customer.email,
    subject: `Payment Receipt – ${invoice ? invoice.invoiceNo : "Account Credit"}`,
    html,
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// 9. LOW STOCK ALERT
// ─────────────────────────────────────────────────────────────────────────────
module.exports.sendLowStockMail = async ({ productName, productCode, stockQty, warningLevel, adminId }, returnPreview = false) => {
  // Fetch admin email from DB using adminId
  let adminEmail = process.env.ADMIN_EMAIL; // fallback
  if (adminId) {
    try {
      const Admin = require("../models/Admin.model");
      const admin = await Admin.findById(adminId).select("email").lean();
      if (admin?.email) adminEmail = admin.email;
    } catch (err) {
      console.error("[sendMail] Failed to fetch admin email:", err.message);
    }
  }

  if (!returnPreview && !adminEmail) {
    console.warn("[sendMail] No admin email found – skipping low stock mail.");
    return;
  }

  const fallback = lowStockTemplate({ productName, productCode, stockQty, warningLevel });

  const html = await getTemplateHtml("low_stock_alert", {
    productName,
    productCode,
    stockQty,
    warningLevel,
  }, fallback);

  if (returnPreview) return html;

  await transporter.sendMail({
    from: process.env.SMTP_USERNAME,
    to: adminEmail,
    subject: `Low Stock Alert – ${productName}`,
    html,
  });
};
