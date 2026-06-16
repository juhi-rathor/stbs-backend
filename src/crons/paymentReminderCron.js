const cron = require("node-cron");
const Invoice = require("../models/invoice.model");
const Customer = require("../models/customer.model");
const SalesOrder = require("../models/salesOrder.model");
const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");
const {
  sendEmailReminder1,
  sendEmailReminder2,
  sendEmailReminder3,
} = require("../services/sendMail");
const Financial = require("../models/financial.model");
const sendFirebaseNotification = require("../utills/sendFirabaseNotification");
const Notification = require("../models/notification.model");
const notificationPath = require("../utills/notificationPath");
const Admin = require("../models/Admin.model");
const EmailLog = require("../models/emailLog.model");
const { CreditInvoiceTemplate } = require("../emailTemplates/ccCustomerEmailTemplate");
const { ProformaInvoiceTemplate } = require("../emailTemplates/pcCustomerEmailTemplate");

cron.schedule("0 9 * * *", async () => {
  try {
    const ONE_DAY_MS = 1000 * 60 * 60 * 24;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    console.log("today", today);

    let admins = await Admin.find({
      isActive: true,
      isDeleted: false,
    });

    // 1️⃣ Find all unpaid invoices
    const financeInvoices = await Financial.find({
      isPaid: false,
      dueDate: { $exists: true, $ne: null },
    })
      .populate("customer")
      .populate("invoice");
      // console.log("financeInvoices", financeInvoices);
// console.log(`Found ${financeInvoi.ces.length} unpaid invoices with due dates.`);
    for (const fin of financeInvoices) {
      const customer = fin.customer;
      const invoice = fin.invoice;

      if (!invoice) continue; // safety

      const baseDueDate = new Date(fin.originalDueDate || fin.dueDate);
      baseDueDate.setHours(0, 0, 0, 0);

      // If due date is in future, skip for now.
      if (today < baseDueDate) {
        // console.log(`Invoice ${invoice.invoiceNo} due on ${baseDueDate.toLocaleDateString("en-GB")} - not due yet.`);
        continue;
      }

      const daysSinceDue = Math.floor((today - baseDueDate) / ONE_DAY_MS);
      const overdueDayNumber = daysSinceDue + 1;

      // REMINDER 1 (day 7 from due date, inclusive counting)
      if (!fin.reminder1Sent) {
        if (overdueDayNumber < 7) {
          continue; // Skip, not 7 days yet
        }

        // Preserve original due date once, so all reminders follow 7/14/21 from the same base date.
        if (!fin.originalDueDate) {
          fin.originalDueDate = baseDueDate;
        }

        // Generate invoice PDF
        let pdfPath = null;
        try {
          pdfPath = await createInvoicePDF(invoice);
        } catch (pdfError) {
          console.error('PDF generation failed for invoice:', invoice.invoiceNo, pdfError.message);
        }

        // Log the email before sending
        const emailLog1 = await EmailLog.create({
          emailType: 'payment_reminder_1',
          referenceType: 'Invoice',
          referenceId: invoice._id,
          recipientEmail: customer.email,
          recipientName: customer.businessName || customer.name,
          subject: `Reminder - Invoice ${invoice.invoiceNo}`,
          body: `First payment reminder for Invoice ${invoice.invoiceNo} with amount ${invoice.gross}`,
          status: 'pending',
          metadata: {
            customerId: customer._id,
            invoiceAmount: invoice.gross,
            dueDate: fin.dueDate,
            originalDueDate: fin.originalDueDate || fin.dueDate
          }
        });
        
        try {
          await sendEmailReminder1(customer, invoice, pdfPath);
          // Update email log status to sent
          emailLog1.status = 'sent';
          emailLog1.sentAt = new Date();
          await emailLog1.save();
          
          console.log("First reminder sent (day 7 from due date) for Invoice:", invoice.invoiceNo);
        } catch (emailErr) {
          // Update email log status to failed
          emailLog1.status = 'failed';
          emailLog1.error = emailErr.message;
          await emailLog1.save();
          console.error('Failed to send first reminder email:', emailErr.message);
        }
        
        // Cleanup PDF
        if (pdfPath && fs.existsSync(pdfPath)) {
          fs.unlinkSync(pdfPath); // Using sync to ensure cleanup happens
        }
        
        fin.reminder1Sent = true;
        await fin.save();

        // first reminder
        for (const admin of admins) {
          await Notification.create({
            title: "Payment Reminder Sent",
            message: `First payment reminder sent for Invoice ${invoice.invoiceNo}`,
            type: "reminder_overdue",
            adminId: admin._id,
            recipientId: invoice._id,
            recipientType: "Invoice",
            path: notificationPath.overdueInvoices,
          });

          if (admin.deviceToken) {
            await sendFirebaseNotification(
              admin.deviceToken,
              "Payment Reminder Sent",
              `First reminder sent for Invoice ${invoice.invoiceNo}`,
              {
                type: "reminder_overdue",
                invoiceId: invoice._id.toString(),
                path: notificationPath.invoices,
              }
            );
          }
        }

        // UPDATE invoice + finance next reminder date -> day 14 from due date
        const nextDate = new Date(baseDueDate.getTime() + 13 * ONE_DAY_MS);

        fin.dueDate = nextDate; // update financial entry
        // invoice.dueDate = nextDate; // update invoice entry

        await fin.save();
        // await invoice.save();

        continue;
      }

      // REMINDER 2 (day 14 from original due date, inclusive counting)
      if (!fin.reminder2Sent) {
        if (overdueDayNumber < 14) {
          continue; // Skip, due date not reached yet
        }
        
        // Generate invoice PDF
        let pdfPath = null;
        try {
          pdfPath = await createInvoicePDF(invoice);
        } catch (pdfError) {
          console.error('PDF generation failed for invoice:', invoice.invoiceNo, pdfError.message);
        }

        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString("en-GB");
        
        // Log the email before sending
        const emailLog2 = await EmailLog.create({
          emailType: 'payment_reminder_2',
          referenceType: 'Invoice',
          referenceId: invoice._id,
          recipientEmail: customer.email,
          recipientName: customer.businessName || customer.name,
          subject: `Second Reminder – Invoice ${invoice.invoiceNo}`,
          body: `Second payment reminder for Invoice ${invoice.invoiceNo} with amount ${invoice.gross}`,
          status: 'pending',
          metadata: {
            customerId: customer._id,
            invoiceAmount: invoice.gross,
            dueDate: fin.dueDate,
            originalDueDate: fin.originalDueDate || fin.dueDate
          }
        });
        
        try {
          await sendEmailReminder2(customer, invoice, sevenDaysAgo, pdfPath);
          // Update email log status to sent
          emailLog2.status = 'sent';
          emailLog2.sentAt = new Date();
          await emailLog2.save();
          
          console.log("Second reminder sent for Invoice:", invoice.invoiceNo);
        } catch (emailErr) {
          // Update email log status to failed
          emailLog2.status = 'failed';
          emailLog2.error = emailErr.message;
          await emailLog2.save();
          console.error('Failed to send second reminder email:', emailErr.message);
        }
        
        // Cleanup PDF
        if (pdfPath && fs.existsSync(pdfPath)) {
          fs.unlinkSync(pdfPath); // Using sync to ensure cleanup happens
        }

        fin.reminder2Sent = true;
        await fin.save();

        // second reminder notification
        for (const admin of admins) {
          await Notification.create({
            title: "Second Payment Reminder",
            message: `Second reminder sent for Invoice ${invoice.invoiceNo}`,
            type: "reminder_overdue",
            adminId: admin._id,
            recipientId: invoice._id,
            recipientType: "Invoice",
            path: notificationPath.overdueInvoices,
          });

          if (admin.deviceToken) {
            await sendFirebaseNotification(
              admin.deviceToken,
              "Second Payment Reminder",
              `Second reminder sent for Invoice ${invoice.invoiceNo}`,
              {
                type: "reminder_overdue",
                invoiceId: invoice._id.toString(),
                path: notificationPath.invoices,
              }
            );
          }
        }

        // NEXT reminder = day 21 from original due date
        const nextDate = new Date(baseDueDate.getTime() + 20 * ONE_DAY_MS);

        fin.dueDate = nextDate;
        // invoice.dueDate = nextDate;

        await fin.save();
        // await invoice.save();

        continue;
      }

      // REMINDER 3 (day 21 from original due date, inclusive counting)
      if (!fin.reminder3Sent) {
        if (overdueDayNumber < 21) {
          continue; // Skip, due date not reached yet
        }

        // Generate invoice PDF
        let pdfPath = null;
        try {
          pdfPath = await createInvoicePDF(invoice);
        } catch (pdfError) {
          console.error('PDF generation failed for invoice:', invoice.invoiceNo, pdfError.message);
        }

        // Log the email before sending
        const emailLog3 = await EmailLog.create({
          emailType: 'payment_reminder_3',
          referenceType: 'Invoice',
          referenceId: invoice._id,
          recipientEmail: customer.email,
          recipientName: customer.businessName || customer.name,
          subject: "URGENT REMINDER  FINAL NOTICE",
          body: `Final payment reminder for Invoice ${invoice.invoiceNo} with amount ${invoice.gross}`,
          status: 'pending',
          metadata: {
            customerId: customer._id,
            invoiceAmount: invoice.gross,
            dueDate: fin.dueDate,
            originalDueDate: fin.originalDueDate || fin.dueDate
          }
        });
        
        try {
          await sendEmailReminder3(customer, invoice, pdfPath);
          // Update email log status to sent
          emailLog3.status = 'sent';
          emailLog3.sentAt = new Date();
          await emailLog3.save();
          
          console.log("Third reminder sent for Invoice:", invoice.invoiceNo);
        } catch (emailErr) {
          // Update email log status to failed
          emailLog3.status = 'failed';
          emailLog3.error = emailErr.message;
          await emailLog3.save();
          console.error('Failed to send third reminder email:', emailErr.message);
        }
        
        // Cleanup PDF
        if (pdfPath && fs.existsSync(pdfPath)) {
          fs.unlinkSync(pdfPath); // Using sync to ensure cleanup happens
        }

        fin.reminder3Sent = true;
        customer.isSuspended = true; // suspend customer after 3rd reminder
        await fin.save();
        await customer.save();

        // third reminder notification
        for (const admin of admins) {
          await Notification.create({
            title: "Final Payment Reminder",
            message: `Final reminder sent. Customer suspended for Invoice ${invoice.invoiceNo}`,
            type: "reminder_overdue",
            adminId: admin._id,
            recipientId: invoice._id,
            recipientType: "Invoice",
            path: notificationPath.overdueInvoices,
          });

          if (admin.deviceToken) {
            await sendFirebaseNotification(
              admin.deviceToken,
              "Final Payment Reminder",
              `Final reminder sent for Invoice ${invoice.invoiceNo}`,
              {
                type: "reminder_overdue",
                invoiceId: invoice._id.toString(),
                path: notificationPath.invoices,
              }
            );
          }
        }

        // FINAL — no more reminders
        fin.dueDate = null;
        // invoice.dueDate = null;

        await fin.save();
        // await invoice.save();

        continue;
      }
    }

    console.log("Finance-based Reminder Cron Completed.");
  } catch (err) {
    console.error("Cron Error:", err);
  }
});

// when create invoice it will save the due date is 2026-02-06T18:30:00.000+00:00
// and payment date 2026-01-30T18:30:00.000+00:00
//  today is 11 dec 2025 if i put this date on db as due date 2025-12-17T18:30:00.000Z then cron is triiger
// now it will save second reminder date is 2026-02-14T18:30:00.000+00:00
// 2026-02-06T18:30:00.000+00:00 already save
// 2025-12-17T18:30:00.000Z manully change

// PDF GENERATOR with Puppeteer
async function generateInvoicePDF(htmlContent, outputPath) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    await page.pdf({
      path: outputPath,
      format: 'A4',
      landscape: false,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
      },
      printBackground: true
    });
    
    console.log("✅ Invoice PDF:", outputPath);
    return { filename: outputPath };
  } catch (error) {
    console.error("PDF Error:", error.message);
    throw new Error(`PDF generation failed: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Helper function to generate invoice PDF
async function createInvoicePDF(invoice) {
  try {
    // Populate order with items and products
    const order = await SalesOrder.findById(invoice.order)
      .populate({
        path: 'items.product',
        select: 'productCode productName description'
      })
      .populate('customerId')
      .lean();

    if (!order) {
      console.error('Order not found for invoice:', invoice.invoiceNo);
      return null;
    }

    // Format items
    const items = order.items.map((i) => ({
      qty: i.qty,
      productName: i.product?.productName || 'N/A',
      unitPrice: i.unitPrice,
      net: i.net,
      vat: i.vat,
      gross: i.gross,
    }));

    const totals = {
      totalNet: invoice.net,
      totalVat: invoice.vat,
      totalGross: invoice.gross,
    };

    // Generate HTML based on invoice type
    const htmlContent = invoice.invoiceType === 'PC'
      ? ProformaInvoiceTemplate(
          invoice.invoiceNo,
          invoice.invoiceDate.toLocaleDateString("en-GB"),
          order.customerId,
          items,
          totals,
          order.deliveryMethod,
          order
        )
      : CreditInvoiceTemplate(
          invoice.invoiceNo,
          invoice.invoiceDate.toLocaleDateString("en-GB"),
          order.customerId,
          items,
          totals,
          order.deliveryMethod,
          order
        );

    // Create PDF directory
    const pdfDir = path.join(__dirname, '../../uploads/invoices');
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }

    // Generate PDF
    const pdfFileName = `Invoice_${invoice.invoiceNo}.pdf`;
    const pdfPath = path.join(pdfDir, pdfFileName);
    await generateInvoicePDF(htmlContent, pdfPath);

    return pdfPath;
  } catch (error) {
    console.error('Error creating invoice PDF:', error.message);
    return null;
  }
}

module.exports.createInvoicePDF = createInvoicePDF;
