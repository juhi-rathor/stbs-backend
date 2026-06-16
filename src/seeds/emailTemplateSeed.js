const EmailTemplate = require("../models/emailTemplate.model");

const templates = [
  // ─── 1. CC Customer Invoice ────────────────────────────────────────────────────
  {
    key: "cc_customer_invoice",
    label: "Credit Invoice (Customer)",
    description: "VAT Invoice sent to credit customers after order dispatch.",
    variables: [
      "{{invoiceNo}}",
      "{{invoiceDate}}",
      "{{customer.businessName}}",
      "{{customer.primaryPhone}}",
      "{{customer.correspondenceAddress}}",
      "{{customer.postcode}}",
      "{{order.salesOrderNumber}}",
      "{{deliveryMethod}}",
      "{{qty}}",
      "{{productName}}",
      "{{unitPrice}}",
      "{{net}}",
      "{{vat}}",
      "{{gross}}",
      "{{totals.totalNet}}",
      "{{totals.totalVat}}",
      "{{totals.totalGross}}",
    ],
    htmlContent: `<!DOCTYPE html>
<html>
<head>
</head>
<body style="font-family: Arial; background: #f4f4f4; padding: 20px; margin: 0;">
  <div class="container" style="background: #fff; padding: 25px; border-radius: 8px; max-width: 700px; margin: auto; box-sizing: border-box; width: 100%; word-wrap: break-word; box-shadow: 0 0 10px rgba(0,0,0,0.1); color: #000; line-height: 1.6;">
    <div class="header" style="font-size: 22px; font-weight: bold; margin-bottom: 10px;">VAT INVOICE – {{invoiceNo}}</div>
    <div class="sub" style="color: #777; margin-bottom: 25px;">Invoice Date: {{invoiceDate}}</div>
    <h3 style="margin-top: 0;">Customer Details</h3>
    <p>
      <strong>{{customer.businessName}}</strong><br>
      customer Address: {{customer.correspondenceAddress}}<br>
      postcode : {{customer.postcode}}<br>
      Tel: {{customer.primaryPhone}}
    </p>
    <p><strong>Order No:</strong> {{order.salesOrderNumber}}</p>
    <p><strong>Delivery Method:</strong> {{deliveryMethod}}</p>
    <h3 style="margin-top: 25px;">Product Details</h3>
    <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
      <thead>
        <tr>
          <th style="background: #f2f2f2; padding: 8px; border: 1px solid #ccc; text-align: left;">QTY</th>
          <th style="background: #f2f2f2; padding: 8px; border: 1px solid #ccc; text-align: left;">DESCRIPTION</th>
          <th style="background: #f2f2f2; padding: 8px; border: 1px solid #ccc; text-align: left;">PRICE</th>
          <th style="background: #f2f2f2; padding: 8px; border: 1px solid #ccc; text-align: left;">NET</th>
          <th style="background: #f2f2f2; padding: 8px; border: 1px solid #ccc; text-align: left;">VAT</th>
          <th style="background: #f2f2f2; padding: 8px; border: 1px solid #ccc; text-align: left;">GROSS</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding: 8px; border: 1px solid #ccc;">{{qty}}</td>
          <td style="padding: 8px; border: 1px solid #ccc;">{{productName}}</td>
          <td style="padding: 8px; border: 1px solid #ccc;">£{{unitPrice}}</td>
          <td style="padding: 8px; border: 1px solid #ccc;">£{{net}}</td>
          <td style="padding: 8px; border: 1px solid #ccc;">£{{vat}}</td>
          <td style="padding: 8px; border: 1px solid #ccc;">£{{gross}}</td>
        </tr>
      </tbody>
    </table>
    <div class="totals" style="margin-top: 20px; text-align: right; font-size: 16px;">
      <p style="margin: 5px 0;"><strong>Total NET:</strong> £{{totals.totalNet}}</p>
      <p style="margin: 5px 0;"><strong>Total VAT:</strong> £{{totals.totalVat}}</p>
      <p style="margin: 5px 0;"><strong>Total GROSS:</strong> £{{totals.totalGross}}</p>
      <p style="margin: 5px 0;"><strong>Payment Terms:</strong> 30 Days From Month End</p>
    </div>
    <div class="footer" style="margin-top: 20px; font-size: 13px; color: #777;">
      Thank you for your business.<br>
      If you have any questions regarding this invoice, please reply to this email.
    </div>
  </div>
</body>
</html>`,
  },

  // ─── 2. PC Customer Invoice ───────────────────────────────────────────────────
  {
    key: "pc_customer_invoice",
    label: "Proforma Invoice (Customer)",
    description: "Proforma Invoice sent to cash customers before payment.",
    variables: [
      "{{invoiceNo}}",
      "{{invoiceDate}}",
      "{{customer.businessName}}",
      "{{customer.address}}",
      "{{customer.postcode}}",
      "{{customer.phone}}",
      "{{order.salesOrderNumber}}",
      "{{deliveryMethod}}",
      "{{qty}}",
      "{{productName}}",
      "{{unitPrice}}",
      "{{net}}",
      "{{vat}}",
      "{{gross}}",
      "{{totals.totalNet}}",
      "{{totals.totalVat}}",
      "{{totals.totalGross}}",
    ],
    htmlContent: `<!DOCTYPE html>
<html>
<head>
</head>
<body style="font-family: Arial; background: #f4f4f4; padding: 20px; margin: 0;">
  <div class="container" style="background: #fff; padding: 25px; border-radius: 8px; max-width: 700px; margin: auto; box-sizing: border-box; width: 100%; word-wrap: break-word; box-shadow: 0 0 10px rgba(0,0,0,0.1); color: #000; line-height: 1.6;">
    <div class="header" style="font-size: 22px; font-weight: bold; margin-bottom: 10px;">PROFORMA INVOICE – {{invoiceNo}}</div>
    <div class="sub" style="color: #777; margin-bottom: 25px;">Invoice Date: {{invoiceDate}}</div>
    <h3 style="margin-top: 0;">Customer Details</h3>
    <p><strong>{{customer.businessName}}</strong><br>
    {{customer.address}}<br>
    {{customer.postcode}}<br>
    Tel: {{customer.phone}}</p>
    <p><strong>Order No:</strong> {{order.salesOrderNumber}}</p>
    <p><strong>Delivery Method:</strong> {{deliveryMethod}}</p>
    <h3 style="margin-top: 25px;">Product Details</h3>
    <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
      <thead>
        <tr>
          <th style="background: #f2f2f2; padding: 8px; border: 1px solid #ccc; text-align: left;">QTY</th>
          <th style="background: #f2f2f2; padding: 8px; border: 1px solid #ccc; text-align: left;">DESCRIPTION</th>
          <th style="background: #f2f2f2; padding: 8px; border: 1px solid #ccc; text-align: left;">PRICE</th>
          <th style="background: #f2f2f2; padding: 8px; border: 1px solid #ccc; text-align: left;">NET</th>
          <th style="background: #f2f2f2; padding: 8px; border: 1px solid #ccc; text-align: left;">VAT</th>
          <th style="background: #f2f2f2; padding: 8px; border: 1px solid #ccc; text-align: left;">GROSS</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding: 8px; border: 1px solid #ccc;">{{qty}}</td>
          <td style="padding: 8px; border: 1px solid #ccc;">{{productName}}</td>
          <td style="padding: 8px; border: 1px solid #ccc;">£{{unitPrice}}</td>
          <td style="padding: 8px; border: 1px solid #ccc;">£{{net}}</td>
          <td style="padding: 8px; border: 1px solid #ccc;">£{{vat}}</td>
          <td style="padding: 8px; border: 1px solid #ccc;">£{{gross}}</td>
        </tr>
      </tbody>
    </table>
    <div class="totals" style="margin-top: 20px; text-align: right; font-size: 16px;">
      <p style="margin: 5px 0;"><strong>Total NET:</strong> £{{totals.totalNet}}</p>
      <p style="margin: 5px 0;"><strong>Total VAT:</strong> £{{totals.totalVat}}</p>
      <p style="margin: 5px 0;"><strong>Total GROSS:</strong> £{{totals.totalGross}}</p>
    </div>
    <div class="footer" style="margin-top: 20px; font-size: 13px; color: #777;">This is a proforma invoice. Payment must be received before dispatch.</div>
  </div>
</body>
</html>`,
  },

  // ─── 3. Dispatch to Freight Team ──────────────────────────────────────────────
  {
    key: "dispatch_freight_team",
    label: "Dispatch Request (Freight Team)",
    description: "Internal email sent to freight team to arrange dispatch.",
    variables: [
      "{{dispatchNumber}}",
      "{{customer.businessName}}",
      "{{customer.deliveryAddress}}",
      "{{customer.primaryPhone}}",
      "{{customer.secondaryPhone}}",
      "{{qty}}",
      "{{productName}}",
      "{{deliveryMethod}}",
      "{{notes}}",
    ],
    htmlContent: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Dispatch Request</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; margin: 0; text-align: center;">
  <div class="container" style="background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0px 0px 10px rgba(0,0,0,0.1); max-width: 600px; margin: auto; box-sizing: border-box; width: 100%; word-wrap: break-word; text-align: left; color: #000; line-height: 1.6;">
    <div class="header" style="font-size: 20px; font-weight: bold; margin-bottom: 10px; color: #333;">DISPATCH REQUEST - {{dispatchNumber}}</div>
    <div class="sub-header" style="font-size: 16px; margin-bottom: 20px; color: #555;">Dear Freight Team, please arrange dispatch of the following order:</div>
    <p><strong>Customer Name:</strong> {{customer.businessName}}</p>
    <p><strong>Customer Delivery Address:</strong> {{customer.deliveryAddress}}</p>
    <p><strong>Customer Primary Telephone:</strong> {{customer.primaryPhone}}</p>
    <p><strong>Customer Secondary Telephone:</strong> {{customer.secondaryPhone}}</p>
    <h3 style="margin-top: 20px;">Product Details</h3>
    <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
      <thead>
        <tr>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: left; background-color: #f9f9f9;">Qty</th>
          <th style="padding: 8px; border: 1px solid #ddd; text-align: left; background-color: #f9f9f9;">Product</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">{{qty}}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">{{productName}}</td>
        </tr>
      </tbody>
    </table>
    <p style="margin-top: 20px;"><strong>Delivery Method:</strong> {{deliveryMethod}}</p>
    <div style="margin-top: 15px; padding: 15px; background-color: #fff3cd; border-left: 5px solid #ffc107; border-radius: 4px; color: #856404;">
      <strong style="display:block; margin-bottom: 5px;">Notes:</strong>
      {{notes}}
    </div>
    <p class="footer" style="margin-top: 20px; font-size: 14px; color: #777;">Please confirm once the shipment has been scheduled for delivery.</p>
  </div>
</body>
</html>`,
  },

  // ─── 4. Dispatch Confirmed ────────────────────────────────────────────────────
  {
    key: "dispatch_confirmed",
    label: "Dispatch Confirmed (Customer)",
    description: "Sent to customer when their order has been dispatched.",
    variables: [
      "{{customerName}}",
      "{{orderNo}}",
      "{{invoiceNo}}",
      "{{dispatchDate}}",
      "{{vehicleNo}}",
      "{{driverName}}",
    ],
    htmlContent: `<!DOCTYPE html>
<html>
<head>
</head>
<body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px; margin: 0;">
  <div class="container" style="background: #fff; padding: 25px; border-radius: 8px; max-width: 600px; margin: auto; box-sizing: border-box; width: 100%; word-wrap: break-word; box-shadow: 0 0 10px rgba(0,0,0,0.1); color: #000; line-height: 1.6;">
    <p>Dear {{customerName}},</p>
    <p>We are pleased to inform you that your order <strong>{{orderNo}}</strong> has been successfully <strong>dispatched</strong>.</p>
    <p><strong>Dispatch Details:</strong></p>
    <ul style="padding-left: 20px;">
      <li><strong>Invoice No:</strong> {{invoiceNo}}</li>
      <li><strong>Dispatch Date:</strong> {{dispatchDate}}</li>
    </ul>
    <p>Your order is on the way and will be delivered as per the agreed delivery schedule.</p>
    <p>If you have any questions, feel free to contact us.</p>
    <p>Kind regards,<br><strong>STBS Ltd</strong></p>
  </div>
</body>
</html>`,
  },

  // ─── 5. Payment Reminder 1 (First) ───────────────────────────────────────────
  {
    key: "payment_reminder_1",
    label: "Payment Reminder – 1st",
    description: "First gentle reminder for unpaid invoice.",
    variables: ["{{customerName}}", "{{invoiceNo}}", "{{amount}}"],
    htmlContent: `<!DOCTYPE html>
<html>
<head>
</head>
<body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px; margin: 0;">
  <div class="container" style="background: #fff; padding: 25px; border-radius: 8px; max-width: 600px; margin: auto; box-sizing: border-box; width: 100%; word-wrap: break-word; line-height: 1.6; color: #000; font-size: 14px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
    <p>Good Morning/Afternoon,</p>
    <p>Hope you're well. This is a gentle reminder that <strong>Invoice {{invoiceNo}}</strong> for <strong>£{{amount}}</strong> appears to remain unpaid.</p>
    <p>We would appreciate it if you could arrange settlement at your earliest convenience. For your reference, a copy of the invoice is attached.</p>
    <p>
      <strong>Our bank details are as follows:</strong><br>
      Account Name: Specialist Tiling &amp; Building Supplies Ltd<br>
      Account Number: 43799256<br>
      Sort Code: 52-30-29
    </p>
    <p>If payment has already been made, please disregard this message and accept our apologies for any inconvenience.</p>
    <p>Thank you for your prompt attention to this matter.</p>
    <p>Kind Regards,</p>
  </div>
</body>
</html>`,
  },

  // ─── 6. Payment Reminder 2 (Second) ──────────────────────────────────────────
  {
    key: "payment_reminder_2",
    label: "Payment Reminder – 2nd",
    description: "Second reminder for unpaid invoice.",
    variables: [
      "{{customerName}}",
      "{{invoiceNo}}",
      "{{amount}}",
      "{{firstReminderDate}}",
    ],
    htmlContent: `<!DOCTYPE html>
<html>
<head>
</head>
<body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px; margin: 0;">
  <div class="container" style="background: #fff; padding: 25px; border-radius: 8px; max-width: 600px; margin: auto; box-sizing: border-box; width: 100%; word-wrap: break-word; line-height: 1.6; color: #000; font-size: 14px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
    <p>Good Morning/Afternoon,</p>
    <p>Hope you're well. This is a gentle reminder that <strong>Invoice {{invoiceNo}}</strong>, for <strong>£{{amount}}</strong> appears to remain unpaid.</p>
    <p>This is a second reminder – the first reminder was sent on <strong>{{firstReminderDate}}</strong>.</p>
    <p>We would appreciate it if you could arrange settlement at your earliest convenience. For your reference, a copy of the invoice is attached.</p>
    <p>
      <strong>Our bank details are as follows:</strong><br>
      Account Name: Specialist Tiling &amp; Building Supplies Ltd<br>
      Account Number: 43799256<br>
      Sort Code: 52-30-29
    </p>
    <p>If payment has already been made, please disregard this message and accept our apologies for any inconvenience.</p>
    <p>Thank you for your prompt attention to this matter.</p>
    <p>Kind Regards</p>
  </div>
</body>
</html>`,
  },

  // ─── 7. Payment Reminder 3 (Third/Final) ─────────────────────────────────────
  {
    key: "payment_reminder_3",
    label: "Payment Reminder – 3rd (Final)",
    description: "Final reminder — urgent overdue notice.",
    variables: [
      "{{customerName}}",
      "{{invoiceNo}}",
      "{{amount}}",
      "{{finalDate}}",
    ],
    htmlContent: `<!DOCTYPE html>
<html>
<head>
</head>
<body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px; margin: 0;">
  <div class="container" style="background: #fff; padding: 25px; border-radius: 8px; max-width: 600px; margin: auto; box-sizing: border-box; width: 100%; word-wrap: break-word; line-height: 1.6; color: #000; font-size: 14px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
    <p>Dear {{customerName}},</p>
    <p>Despite previous reminders, payment for invoice <strong>{{invoiceNo}}</strong> for <strong>£{{amount}}</strong> remains outstanding and is now <strong>21 days overdue</strong>.</p>
    <p>If your payment is not received in the next 3 working days, your future credit terms may be affected.</p>
    <p>This is your <strong>final reminder</strong>. Please treat this matter with urgency.</p>
    <p>Sincerely,<br>STBS Ltd</p>
  </div>
</body>
</html>`,
  },

  // ─── 8. Forget Password ───────────────────────────────────────────────────────
  {
    key: "forget_password",
    label: "Forgot Password",
    description: "Password reset link email.",
    variables: ["{{name}}", "{{forgetPasswordLink}}"],
    htmlContent: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Reset Your Password</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f4f4f4; text-align: center; padding: 20px; margin: 0;">
  <div class="container" style="background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1); max-width: 500px; margin: auto; box-sizing: border-box; width: 100%; word-wrap: break-word; text-align: left; color: #000;">
    <h2 style="margin-top: 0; color: #333;">Hello, {{name}}</h2>
    <p style="line-height: 1.6;">You requested to reset your password. Click the button below to proceed.</p>
    <div style="text-align: center; margin-top: 25px;">
      <a class="btn" href="{{forgetPasswordLink}}" target="_blank" style="display: inline-block; padding: 12px 24px; font-size: 16px; color: #fff; background-color: #007bff; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
    </div>
    <p style="margin-top: 25px; font-size: 14px; color: #666; line-height: 1.6;">If you didn't request this, please ignore this email.</p>
  </div>
</body>
</html>`,
  },

  // ─── 9. Low Stock Alert ───────────────────────────────────────────────────────
  {
    key: "low_stock_alert",
    label: "Low Stock Alert",
    description: "Internal alert when a product falls below warning level.",
    variables: [
      "{{productName}}",
      "{{productCode}}",
      "{{stockQty}}",
      "{{warningLevel}}",
    ],
    htmlContent: `<!DOCTYPE html>
<html>
<head>
</head>
<body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px; margin: 0;">
  <div class="container" style="background: #fff; padding: 25px; border-radius: 8px; max-width: 600px; margin: auto; box-sizing: border-box; width: 100%; word-wrap: break-word; box-shadow: 0 0 10px rgba(0,0,0,0.1); color: #000; line-height: 1.6;">
    <h2 style="color: #c0392b; margin-top: 0;">Low Stock Alert</h2>
    <p>The stock level for the following product has reached or fallen below the warning threshold.</p>
    <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
      <tr><td style="border: 1px solid #ccc; padding: 8px;"><b>Product Name</b></td><td style="border: 1px solid #ccc; padding: 8px;">{{productName}}</td></tr>
      <tr><td style="border: 1px solid #ccc; padding: 8px;"><b>Product Code</b></td><td style="border: 1px solid #ccc; padding: 8px;">{{productCode}}</td></tr>
      <tr><td style="border: 1px solid #ccc; padding: 8px;"><b>Current Stock</b></td><td style="border: 1px solid #ccc; padding: 8px;">{{stockQty}}</td></tr>
      <tr><td style="border: 1px solid #ccc; padding: 8px;"><b>Warning Level</b></td><td style="border: 1px solid #ccc; padding: 8px;">{{warningLevel}}</td></tr>
    </table>
    <p style="margin-top:20px;">Please reorder stock immediately to avoid order disruption.</p>
    <p style="margin-top: 20px;">Regards,<br><strong>STBS System</strong></p>
  </div>
</body>
</html>`,
  },

  {
    key: "monthly_statement",
    label: "Monthly Statement",
    description: "Monthly account statement sent to customers.",
    variables: [
      "{{customerName}}",
      "{{businessName}}",
      "{{customerCode}}",
      "{{email}}",
      "{{address}}",
      "{{monthName}}",
      "{{issueDate}}",
      "{{invoiceRows}}",
      "{{totalPaid}}",
      "{{totalDue}}",
      "{{logoUrl}}",
    ],
    htmlContent: `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>Monthly Statement</title>
<style>
  body {
    font-family: "Inter", "Calibri", Arial, Helvetica, sans-serif;
    font-size: 9px;
    color: #000;
    margin: 16px;
  }
  .page { border: 1px solid #000; padding: 14px; }

  /* HEADER */
  .header {
    display: flex;
    gap: 14px;
    align-items: flex-start;
    margin-bottom: 12px;
  }
  .logo img { max-width: 120px; height: auto; display: block; }
  .company { font-size: 10px; line-height: 1.4; }

  .title {
    font-weight: 700;
    color: #003399;
    font-size: 12px;
    margin: 8px 0 10px;
  }

  /* TABLE */
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #000; padding: 4px 5px; vertical-align: top; }
  thead th { background: #cc0000; color: #fff; font-weight: 600; font-size: 10px; }
  tbody td { font-size: 8px; }

  .plain td { border: none; padding: 2px 0; }
  .r  { text-align: left; }
  .c  { text-align: center; }
  .s  { text-align: left; }
  .section { margin-top: 10px; }

  /* FOOTER */
  .payment { font-size: 10px; line-height: 1.4; }
</style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="header">
    {{logoUrl}} </div>
    <div class="company">
      <strong>Specialist Tile &amp; Building Material Ltd</strong><br/>
      40 Market Place<br/>
      Heckmondwike<br/>
      W.Yorks, WF16 0HT<br/><br/>
      Tel: (01924) 763272 | Email: info@stbs.uk<br/>
      VAT No: 464851075 | Company No. 15265320
    </div>
 

  <!-- TITLE -->
  <div class="title">MONTHLY STATEMENT</div>

  <!-- CUSTOMER DETAILS -->
  <table class="plain">
    <tr>
      <td>
        <strong>Account Number:</strong> {{customerCode}}<br/>
        <strong>For:</strong> {{businessName}}<br/>
        {{email}}
        {{address}}
      </td>
      <td class="r">
        <strong>Month:</strong> {{monthName}}<br/>
        <strong>Date Issued:</strong> {{issueDate}}
      </td>
    </tr>
  </table>

  <!-- INVOICE TABLE -->
  <div class="section">
    <table>
      <thead>
        <tr>
        <th>Invoice Date</th>
          <th>Invoice Number</th>
          <th>Product Code</th>
          <th>Description</th>
          <th>QTY</th>
          <th>COST/PIECE</th>
          <th>VAT (Y/N)</th>
          <th>NET</th>
          <th>VAT</th>
          <th>GROSS</th>
          <th>PAID (Y/N)</th>
          <th>Paid Amount</th>
          <th>Unpaid Amount</th>
        </tr>
      </thead>
      <tbody>
        {{invoiceRows}}
      </tbody>
    </table>
  </div>

  <!-- TOTALS -->
  <table class="plain section">
    <tr class="c">
      <td class="r"><strong>Total Paid</strong></td>
      <td class="s">£{{totalPaid}}</td>
    </tr>
    <tr class="c">
      <td class="r"><strong>Outstanding Balance:</strong></td>
      <td class="s">-£{{totalDue}}</td>
    </tr>
  </table>

  <!-- PAYMENT INSTRUCTIONS -->
  <div class="section payment">
    <strong class="title">Payment Instructions:</strong><br/>
    Account Name : Specialist Tiling &amp; Building Supplies<br/>
    Account Number : 43799256<br/>
    Sort Code : 52-30-29<br/>
    Reference: Please use your account number or invoice number
  </div>

</div>
</body>
</html>`,
  },

  // ─── 11. Payment Receipt ──────────────────────────────────────────────────────

  {
    key: "payment_receipt",
    label: "Payment Receipt",
    description: "Sent to customer after payment is recorded.",
    variables: [
      "{{customer.businessName}}",
      "{{invoice.invoiceNo}}",
      "{{invoice.gross}}",
      "{{payment.credit}}",
      "{{payment.paymentMethod}}",
      "{{payment.referenceNo}}",
      "{{payment.transactionDate}}",
      "{{invoice.amountDue}}",
    ],
    htmlContent: `<!DOCTYPE html>
<html>
<head>
</head>
<body style="font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px; margin: 0;">
  <div class="container" style="background: #fff; padding: 25px; border-radius: 8px; max-width: 600px; margin: auto; box-sizing: border-box; width: 100%; word-wrap: break-word; box-shadow: 0 0 10px rgba(0,0,0,0.1); color: #000; line-height: 1.6;">
    <h2 style="color: #333; margin-top: 0;">Payment Receipt</h2>
    <p>Hello <b>{{customer.businessName}}</b>,</p>
    <p>We have received your payment. Below are the details:</p>
    <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
      <tr><td style="border: 1px solid #ccc; padding: 8px;"><b>Invoice No</b></td><td style="border: 1px solid #ccc; padding: 8px;">{{invoice.invoiceNo}}</td></tr>
      <tr><td style="border: 1px solid #ccc; padding: 8px;"><b>Total Invoice Amount</b></td><td style="border: 1px solid #ccc; padding: 8px;">£{{invoice.gross}}</td></tr>
      <tr><td style="border: 1px solid #ccc; padding: 8px;"><b>Amount Paid</b></td><td style="border: 1px solid #ccc; padding: 8px;">£{{payment.credit}}</td></tr>
      <tr><td style="border: 1px solid #ccc; padding: 8px;"><b>Payment Method</b></td><td style="border: 1px solid #ccc; padding: 8px;">{{payment.paymentMethod}}</td></tr>
      <tr><td style="border: 1px solid #ccc; padding: 8px;"><b>Reference No</b></td><td style="border: 1px solid #ccc; padding: 8px;">{{payment.referenceNo}}</td></tr>
      <tr><td style="border: 1px solid #ccc; padding: 8px;"><b>Payment Date</b></td><td style="border: 1px solid #ccc; padding: 8px;">{{payment.transactionDate}}</td></tr>
    </table>
    <br/>
    <p>Thank you for your business.</p>
    <p>Regards,<br/>Accounts Team</p>
  </div>
</body>
</html>`,
  },
];

/**
 * Seeds all email templates into DB.
 * Uses upsert — safe to run multiple times.
 */
const seedEmailTemplates = async (key = null) => {
  try {
    let templatesToSeed = templates;
    if (key) {
      templatesToSeed = templates.filter((t) => t.key === key);
      if (templatesToSeed.length === 0) {
        throw new Error(`Template with key '${key}' not found in seed data.`);
      }
    }

    const ops = templatesToSeed.map((t) => ({
      updateOne: {
        filter: { key: t.key },
        update: { $set: t },
        upsert: true,
      },
    }));

    const result = await EmailTemplate.bulkWrite(ops);
    console.log(
      `✅ Email templates seeded: ${result.upsertedCount} inserted, ${result.modifiedCount} updated.`
    );
    return result;
  } catch (err) {
    console.error("❌ Email template seeding failed:", err.message);
    throw err;
  }
};

module.exports = { seedEmailTemplates, templates };
