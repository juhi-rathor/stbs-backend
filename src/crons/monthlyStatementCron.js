const Admin = require("../models/Admin.model");
const Notification = require("../models/notification.model");
const sendFirebaseNotification = require("../utills/sendFirabaseNotification");
const notificationPath = require("../utills/notificationPath");
const EmailLog = require("../models/emailLog.model");
const cron = require("node-cron");
const nodemailer = require("nodemailer");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const Customer = require("../models/customer.model");
const Invoice = require("../models/invoice.model");
const { monthlyStatementTemplate } = require("../emailTemplates/monthlyStatementTemplate");

// ── Helper: build <tr> rows from formattedInvoices (same as original template logic) ──
function buildInvoiceRowsHtml(formattedInvoices) {
  return formattedInvoices.map(i => `
<tr>
<td>${new Date(i.invoiceDate).toLocaleDateString("en-GB")}</td>
  <td>${i.invoiceNo}</td>
  <td>${i.productCode || ""}</td>
  <td>${i.description || ""}</td>
  <td class="c">${i.qty || ""} ${i.qtyType || ""}</td>
  <td class="r">£${i.costPerPiece ? Number(i.costPerPiece).toFixed(2) : "0.00"}</td>
  <td class="c">${i.vat > 0 ? "Yes" : "No"}</td>
  <td class="r">£${Number(i.net || 0).toFixed(2)}</td>
  <td class="r">£${Number(i.vat || 0).toFixed(2)}</td>
  <td class="r">£${Number(i.gross || 0).toFixed(2)}</td>
  <td class="c">${i.isPaid ? "Yes" : "No"}</td>
  <td class="r">${i.amountPaid ? "£" + Number(i.amountPaid).toFixed(2) : "£0.00"}</td>
  <td class="r">${i.amountDue ? "-£" + Math.abs(Number(i.amountDue)).toFixed(2) : "£0.00"}</td>
</tr>`).join("");
}

// ── Helper: fetch DB template and inject all variables ────────────────────────
async function buildMonthlyStatementHtml({
  customerName, customerData, formattedInvoices, month, year, logoHtml
}) {
  const EmailTemplate = require("../models/emailTemplate.model");
  const monthName = new Date(year, month - 1).toLocaleString("en-GB", { month: "long" });
  const issueDate = new Date().toLocaleDateString("en-GB");
  const invoiceRows = buildInvoiceRowsHtml(formattedInvoices);
  const totalPaid = formattedInvoices.reduce((s, i) => s + (i.amountPaid || 0), 0);
  const totalDue  = formattedInvoices.reduce((s, i) => s + (i.amountDue  || 0), 0);

  try {
    const tmpl = await EmailTemplate.findOne({ key: "monthly_statement" }).lean();
    if (tmpl) {
      let html = tmpl.htmlContent;
      const vars = {
        customerName,
        businessName:  customerData.businessName,
        customerCode:  customerData.customerCode,
        email:         customerData.email ? customerData.email + "<br/>" : "",
        address:       customerData.address || "",
        monthName,
        issueDate,
        invoiceRows,
        totalPaid:     totalPaid.toFixed(2),
        totalDue:      Math.abs(totalDue).toFixed(2),
        logoUrl:       logoHtml || "",
      };
      for (const [k, v] of Object.entries(vars)) {
        html = html.split(`{{${k}}}`).join(String(v ?? ""));
      }
      return html;
    }
  } catch (err) {
    console.warn("[monthly cron] DB template lookup failed, using fallback:", err.message);
  }

  // Fallback to original hardcoded template
  return monthlyStatementTemplate(customerName, customerData, formattedInvoices, month, year, logoHtml || "");
}

// ✅ FIXED: 1st of every month at 9:00 AM
cron.schedule("0 9 1 * *", async () => {
  try {
    const today = new Date();
    const prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const prevMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    const month = prevMonthStart.getMonth() + 1;
    const year = prevMonthStart.getFullYear();

    // console.log(`🚀 Generating statements for ${month}/${year}`);

    // Create PDF directory
  const pdfDir = path.join(__dirname, "../../uploads/statements");
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }

    // ✅ Validate environment variables
    if (!process.env.SMTP_USERNAME || !process.env.SMTP_PASSWORD) {
      console.error("❌ Missing SMTP_USERNAME or SMTP_PASSWORD");
      return;
    }

    // ✅ FIXED: No regex - simple email check
    const customers = await Customer.find({
      isActive: true,
      isDeleted: false,
      email: { $exists: true, $ne: null, $ne: "" }
    }).lean();

    // console.log(`📋 Found ${customers.length} customers with emails`);

    const admins = await Admin.find({ isActive: true, isDeleted: false });

    // ✅ FIXED: createTransport (NOT createTransporter)
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD, // Gmail App Password required
      },
      tls: { 
        rejectUnauthorized: false 
      },
    });

    // Verify SMTP connection
    await transporter.verify();
    console.log("✅ SMTP connection verified");

    let sentCount = 0, skippedCount = 0, errorCount = 0;

    for (const customer of customers) {
      let pdfFilePath = null;
      try {
        // ✅ Manual email validation (safer)
        if (!customer.email || !customer.email.includes('@') || !customer.email.includes('.')) {
          // console.log(`⏭️ Skipped ${customer.email || 'no-email'} - invalid email`);
          skippedCount++;
          continue;
        }

        // Get invoices for period with order details populated
        const invoices = await Invoice.find({
          customer: customer._id,
          invoiceDate: { 
            $gte: prevMonthStart, 
            $lte: prevMonthEnd 
          },
        }).populate({
          path: 'order',
          populate: {
            path: 'items.product',
            select: 'productCode productName description'
          }
        }).lean();

        if (invoices.length === 0) {
          // console.log(`⏭️ Skipped ${customer.email} - no invoices`);
          skippedCount++;
          continue;
        }

        // Format customer address
        const formattedAddress = customer.correspondenceAddress 
          ? [
              customer.correspondenceAddress.line1,
              customer.correspondenceAddress.line2,
              customer.correspondenceAddress.city,
              customer.correspondenceAddress.state,
              customer.correspondenceAddress.postcode
            ].filter(Boolean).join(', ')
          : '';

        // Format invoices with product details from order
        const formattedInvoices = invoices.map(inv => {
          const orderItem = inv.order?.items?.[0]; // Get first item (or loop if multiple)
          const product = orderItem?.product;
          
          // Calculate amounts based on isPaid status
          let amountPaid = 0;
          let amountDue = 0;
          
          if (inv.isPaid) {
            // If fully paid
            amountPaid = inv.amountPaid || inv.gross || 0;
            amountDue = 0;
          } else {
            // If not paid
            amountPaid = inv.amountPaid || 0;
            // If amountDue exists, use it; otherwise unpaid = gross - amountPaid
            amountDue = inv.amountDue !== undefined ? inv.amountDue : (inv.gross || 0) - amountPaid;
          }
          
          return {
            invoiceNo: inv.invoiceNo,
            invoiceDate: inv.invoiceDate,
            productCode: product?.productCode || 'N/A',
            description: product?.description || 'N/A',
            qty: orderItem?.qty || 0,
            
            qtyType: orderItem?.qtyType,
            costPerPiece: orderItem?.unitPrice || 0,
            net: inv.net || 0,
            vat: inv.vat || 0,
            gross: inv.gross || 0,
            isPaid: inv.isPaid || false,
            amountPaid: amountPaid,
            amountDue: amountDue
          };
        });

        // Prepare customer data with flat address
        const customerData = {
          customerCode: customer.customerCode,
          businessName: customer.businessName,
          email: customer.email,
          address: formattedAddress
        };

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

        // Generate HTML template for PDF (base64 logo) — uses DB template
        const pdfTemplate = await buildMonthlyStatementHtml({
          customerName: customer.name || customer.businessName || 'Customer',
          customerData,
          formattedInvoices,
          month,
          year,
          logoHtml: logoBase64 ? `<div class="logo"><img src="${logoBase64}" alt="STBS Logo" /></div>` : '',
        });

        // Generate HTML template for Email (CID logo) — uses DB template
        const emailTemplate = await buildMonthlyStatementHtml({
          customerName: customer.name || customer.businessName || 'Customer',
          customerData,
          formattedInvoices,
          month,
          year,
          logoHtml: `<div class="logo"><img src="cid:stbs-logo" alt="STBS Logo" /></div>`,
        });

        const monthName = new Date(year, month - 1).toLocaleString("default", { 
          month: "long", 
          year: "numeric" 
        });
        
        const subject = `Monthly Invoice Statement - ${monthName}`;
        const pdfFileName = `statement_${customer.customerCode || 'CUST'}_${year}_${String(month).padStart(2, '0')}.pdf`;
        pdfFilePath = path.join(pdfDir, pdfFileName);

        // Generate PDF
        await generatePDF(pdfTemplate, pdfFilePath);
        console.log(`📄 PDF created: ${pdfFileName}`);

        // Send email with attachment and embedded logo
        const mailOptions = {
          from: `"Monthly Statements" <${process.env.SMTP_USERNAME}>`,
          to: customer.email,
          subject: subject,
          html: emailTemplate,
          attachments: [
            {
              filename: pdfFileName,
              path: pdfFilePath,
              contentType: 'application/pdf'
            },
            {
              filename: 'stbsPdfLogo.png',
              path: logoPath,
              cid: 'stbs-logo' // Same as used in template
            }
          ]
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent to ${customer.email}`);
        sentCount++;

        // EMAIL LOG
        await EmailLog.create({
          emailType: 'monthly_statement',
          referenceType: 'Customer',
          referenceId: customer._id,
          recipientEmail: customer.email,
          recipientName: customer.businessName || customer.name,
          subject,
          body: `Monthly statement for ${monthName} sent to ${customer.email}`,
          status: 'sent',
          sentAt: new Date(),
          metadata: {
            customerId: customer._id,
            customerCode: customer.customerCode,
            month,
            year,
            invoiceCount: invoices.length,
          },
        }).catch((err) => console.error(`[cron] EmailLog save failed:`, err.message));

        // Admin notifications
        for (const admin of admins) {
          try {
            await Notification.create({
              title: "Monthly Statement Sent",
              message: `Statement sent to ${customer.businessName || customer.name}`,
              type: "monthly_statement",
              adminId: admin._id,
              recipientId: customer._id,
              recipientType: "Customer",
              path: notificationPath.customers,
            });

            if (admin.deviceToken) {
              await sendFirebaseNotification(
                admin.deviceToken,
                "Monthly Statement Sent",
                `Statement sent to ${customer.businessName || customer.name}`,
                {
                  type: "monthly_statement",
                  customerId: customer._id.toString(),
                  path: notificationPath.customers,
                }
              );
            }
          } catch (notifError) {
            console.error(`Notification failed for admin ${admin._id}:`, notifError.message);
          }
        }

      } catch (error) {
        console.error(`❌ Failed ${customer?.email || 'unknown'}:`, error.message);
        errorCount++;

        // EMAIL LOG — save failure
        EmailLog.create({
          emailType: 'monthly_statement',
          referenceType: 'Customer',
          referenceId: customer._id,
          recipientEmail: customer.email,
          recipientName: customer.businessName || customer.name,
          subject: `Monthly Invoice Statement`,
          body: `Failed to send monthly statement to ${customer.email}`,
          status: 'failed',
          sentAt: null,
          error: error.message,
          metadata: { customerId: customer._id },
        }).catch((err) => console.error(`[cron] EmailLog error-save failed:`, err.message));
      } finally {
        // Cleanup PDF
        if (pdfFilePath && fs.existsSync(pdfFilePath)) {
          fs.unlink(pdfFilePath, (err) => {
            if (err) console.error(`PDF cleanup failed: ${err.message}`);
          });
        }
      }
    }

    console.log(`\n🎉 SUMMARY: Sent=${sentCount} | Skipped=${skippedCount} | Errors=${errorCount}`);
    
  } catch (error) {
    console.error("💥 CRON FAILED:", error.message);
  }
});

// console.log('🕐 Monthly Cron: "0 9 1 * *" (1st @ 9AM)');

// ✅ MANUAL FUNCTION (identical logic)
module.exports.sendMonthlyStatementsToAll = async (useCurrentMonth = false) => {
  try {
    console.log("🚀 MANUAL Monthly Statements Started...");

    const today = new Date();
    let prevMonthStart, prevMonthEnd;
    
    if (useCurrentMonth) {
      prevMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      prevMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      console.log("📅 Using CURRENT month");
    } else {
      prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      prevMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    }

    const month = prevMonthStart.getMonth() + 1;
    const year = prevMonthStart.getFullYear();

    console.log(`🚀 Generating statements for ${month}/${year}`);

    // Create PDF directory
    const pdfDir = path.join(__dirname, "../../uploads/statements");
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }

    // ✅ Validate environment variables
    if (!process.env.SMTP_USERNAME || !process.env.SMTP_PASSWORD) {
      console.error("❌ Missing SMTP_USERNAME or SMTP_PASSWORD");
      return { sent: 0, skipped: 0, errors: 1 };
    }

    // ✅ FIXED: No regex - simple email check
    const customers = await Customer.find({
      isActive: true,
      isDeleted: false,
      email: { $exists: true, $ne: null, $ne: "" }
    }).lean();

    console.log(`📋 Found ${customers.length} customers with emails`);

    const admins = await Admin.find({ isActive: true, isDeleted: false });

    // ✅ FIXED: createTransport (NOT createTransporter)
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD,
      },
      tls: { 
        rejectUnauthorized: false 
      },
    });

    // Verify SMTP connection
    await transporter.verify();
    console.log("✅ SMTP connection verified");

    let sentCount = 0, skippedCount = 0, errorCount = 0;

    for (const customer of customers) {
      let pdfFilePath = null;
      try {
        // ✅ Manual email validation (safer)
        if (!customer.email || !customer.email.includes('@') || !customer.email.includes('.')) {
          console.log(`⏭️ Skipped ${customer.email || 'no-email'} - invalid email`);
          skippedCount++;
          continue;
        }

        // Get invoices for period with order details populated
        const invoices = await Invoice.find({
          customer: customer._id,
          invoiceDate: { 
            $gte: prevMonthStart, 
            $lte: prevMonthEnd 
          },
        }).populate({
          path: 'order',
          populate: {
            path: 'items.product',
            select: 'productCode productName description'
          }
        }).lean();

        if (invoices.length === 0) {
          console.log(`⏭️ Skipped ${customer.email} - no invoices`);
          skippedCount++;
          continue;
        }

        // Format customer address
        const formattedAddress = customer.correspondenceAddress 
          ? [
              customer.correspondenceAddress.line1,
              customer.correspondenceAddress.line2,
              customer.correspondenceAddress.city,
              customer.correspondenceAddress.state,
              customer.correspondenceAddress.postcode
            ].filter(Boolean).join(', ')
          : '';

        // Format invoices with product details from order
        const formattedInvoices = invoices.map(inv => {
          const orderItem = inv.order?.items?.[0];
          const product = orderItem?.product;
          
          // Calculate amounts based on isPaid status
          let amountPaid = 0;
          let amountDue = 0;
          
          if (inv.isPaid) {
            // If fully paid
            amountPaid = inv.amountPaid || inv.gross || 0;
            amountDue = 0;
          } else {
            // If not paid
            amountPaid = inv.amountPaid || 0;
            // If amountDue exists, use it; otherwise unpaid = gross - amountPaid
            amountDue = inv.amountDue !== undefined ? inv.amountDue : (inv.gross || 0) - amountPaid;
          }
          
          return {
            invoiceNo: inv.invoiceNo,
            invoiceDate: inv.invoiceDate,
            productCode: product?.productCode || 'N/A',
            description: product?.productName || product?.description || 'N/A',
            qty: orderItem?.qty || 0,
            costPerPiece: orderItem?.unitPrice || 0,
            net: inv.net || 0,
            vat: inv.vat || 0,
            gross: inv.gross || 0,
            isPaid: inv.isPaid || false,
            amountPaid: amountPaid,
            amountDue: amountDue
          };
        });

        // Prepare customer data with flat address
        const customerData = {
          customerCode: customer.customerCode,
          businessName: customer.businessName,
          email: customer.email,
          address: formattedAddress
        };

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

        // Generate HTML template for PDF (base64 logo) — uses DB template
        const pdfTemplate = await buildMonthlyStatementHtml({
          customerName: customer.name || customer.businessName || 'Customer',
          customerData,
          formattedInvoices,
          month,
          year,
          logoHtml: logoBase64 ? `<div class="logo"><img src="${logoBase64}" alt="STBS Logo" /></div>` : '',
        });

        // Generate HTML template for Email (CID logo) — uses DB template
        const emailTemplate = await buildMonthlyStatementHtml({
          customerName: customer.name || customer.businessName || 'Customer',
          customerData,
          formattedInvoices,
          month,
          year,
          logoHtml: `<div class="logo"><img src="cid:stbs-logo" alt="STBS Logo" /></div>`,
        });

        const monthName = new Date(year, month - 1).toLocaleString("default", { 
          month: "long", 
          year: "numeric" 
        });
        
        const subject = `Monthly Invoice Statement - ${monthName}`;
        const pdfFileName = `statement_${customer.customerCode || 'CUST'}_${year}_${String(month).padStart(2, '0')}.pdf`;
        pdfFilePath = path.join(pdfDir, pdfFileName);

        // Generate PDF
        await generatePDF(pdfTemplate, pdfFilePath);
        console.log(`📄 PDF created: ${pdfFileName}`);

        // Send email with attachment and embedded logo
        const mailOptions = {
          from: `"Monthly Statements" <${process.env.SMTP_USERNAME}>`,
          to: customer.email,
          subject: subject,
          html: emailTemplate,
          attachments: [
            {
              filename: pdfFileName,
              path: pdfFilePath,
              contentType: 'application/pdf'
            },
            {
              filename: 'stbsPdfLogo.png',
              path: logoPath,
              cid: 'stbs-logo' // Same as used in template
            }
          ]
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Email sent to ${customer.email}`);
        sentCount++;

        // EMAIL LOG
        await EmailLog.create({
          emailType: 'monthly_statement',
          referenceType: 'Customer',
          referenceId: customer._id,
          recipientEmail: customer.email,
          recipientName: customer.businessName || customer.name,
          subject,
          body: `Monthly statement for ${monthName} sent to ${customer.email}`,
          status: 'sent',
          sentAt: new Date(),
          metadata: {
            customerId: customer._id,
            customerCode: customer.customerCode,
            month,
            year,
            invoiceCount: invoices.length,
          },
        }).catch((err) => console.error(`[manual] EmailLog save failed:`, err.message));

        // Admin notifications
        for (const admin of admins) {
          try {
            await Notification.create({
              title: "Monthly Statement Sent",
              message: `Statement sent to ${customer.businessName || customer.name}`,
              type: "monthly_statement",
              adminId: admin._id,
              recipientId: customer._id,
              recipientType: "Customer",
              path: notificationPath.customers,
            });

            if (admin.deviceToken) {
              await sendFirebaseNotification(
                admin.deviceToken,
                "Monthly Statement Sent",
                `Statement sent to ${customer.businessName || customer.name}`,
                {
                  type: "monthly_statement",
                  customerId: customer._id.toString(),
                  path: notificationPath.customers,
                }
              );
            }
          } catch (notifError) {
            console.error(`Notification failed for admin ${admin._id}:`, notifError.message);
          }
        }

      } catch (error) {
        console.error(`❌ Failed ${customer?.email || 'unknown'}:`, error.message);
        errorCount++;

        // EMAIL LOG — save failure
        EmailLog.create({
          emailType: 'monthly_statement',
          referenceType: 'Customer',
          referenceId: customer._id,
          recipientEmail: customer.email,
          recipientName: customer.businessName || customer.name,
          subject: `Monthly Invoice Statement`,
          body: `Failed to send monthly statement to ${customer.email}`,
          status: 'failed',
          sentAt: null,
          error: error.message,
          metadata: { customerId: customer._id },
        }).catch((err) => console.error(`[manual] EmailLog error-save failed:`, err.message));
      } finally {
        // Cleanup PDF
        if (pdfFilePath && fs.existsSync(pdfFilePath)) {
          fs.unlink(pdfFilePath, (err) => {
            if (err) console.error(`PDF cleanup failed: ${err.message}`);
          });
        }
      }
    }

    console.log(`\n🎉 SUMMARY: Sent=${sentCount} | Skipped=${skippedCount} | Errors=${errorCount}`);
    console.log("🎉 Manual job complete!");
    return { sent: sentCount, skipped: skippedCount, errors: errorCount };
  } catch (error) {
    console.error("Manual job failed:", error);
    throw error;
  }
};

// ✅ PDF GENERATOR with Puppeteer
async function generatePDF(htmlContent, outputPath = null, options = {}) {
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
    
    const pdfOptions = {
      format: options.format || 'A4',
      landscape: options.landscape !== undefined ? options.landscape : true,
      margin: options.margin || {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
      },
      printBackground: true
    };

    if (outputPath) {
      pdfOptions.path = outputPath;
      await page.pdf(pdfOptions);
      console.log("✅ PDF:", outputPath);
      return { filename: outputPath };
    } else {
      const pdfBuffer = await page.pdf(pdfOptions);
      return pdfBuffer;
    }
  } catch (error) {
    console.error("PDF Error:", error.message);
    throw new Error(`PDF generation failed: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports.generatePDF = generatePDF;
module.exports.buildMonthlyStatementHtml = buildMonthlyStatementHtml;
