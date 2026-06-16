const formatAddress = (addr) => {
  if (!addr) return "";

  return `
    ${addr.line1 || ""}<br>
    ${addr.line2 || ""}<br>
    ${addr.city || ""}, ${addr.state || ""} 
  `;
};

module.exports.CreditInvoiceTemplate = (
  invoiceNo,
  invoiceDate,
  customer,
  items,
  totals,
  deliveryMethod,
  order
) => {
  const itemRows = items
    .map(
      (i) => `
        <tr>
          <td style="padding: 8px; border: 1px solid #ccc;">${i.qty}</td>
          <td style="padding: 8px; border: 1px solid #ccc;">${
            i.productName
          }</td>
          <td style="padding: 8px; border: 1px solid #ccc;">£${i.unitPrice.toFixed(
            2
          )}</td>
          <td style="padding: 8px; border: 1px solid #ccc;">£${i.net.toFixed(
            2
          )}</td>
          <td style="padding: 8px; border: 1px solid #ccc;">£${i.vat.toFixed(
            2
          )}</td>
          <td style="padding: 8px; border: 1px solid #ccc;">£${i.gross.toFixed(
            2
          )}</td>
        </tr>
      `
    )
    .join("");

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body { font-family: Arial; background: #f4f4f4; padding: 40px; }
      .container {
        background: #fff; padding: 25px; border-radius: 8px; max-width: 700px;
        margin: auto; box-shadow: 0 0 10px rgba(0,0,0,0.1);
      }
      .header { font-size: 22px; font-weight: bold; margin-bottom: 10px; }
      .sub { color: #777; margin-bottom: 25px; }
      table { width: 100%; border-collapse: collapse; margin-top: 15px; }
      th { background: #f2f2f2; padding: 8px; border: 1px solid #ccc; }
      td { padding: 8px; border: 1px solid #ccc; }
      .totals { margin-top: 20px; text-align: right; font-size: 16px; }
      .footer { margin-top: 20px; font-size: 13px; color: #777; }
    </style>
  </head>

  <body>
    <div class="container">
      <div class="header">VAT INVOICE – ${invoiceNo}</div>
      <div class="sub">Invoice Date: ${invoiceDate}</div>

      <h3>Customer Details</h3>
     <p>
  <strong>${customer.businessName}</strong><br>
 customer Address: ${formatAddress(customer.correspondenceAddress)}<br>
 postcode : ${customer.correspondenceAddress.postcode}
  <br>
  Tel: ${customer.primaryPhone || "N/A"}
</p>

      <p><strong>Order No:</strong> ${order.salesOrderNumber}</p>
      <p><strong>Delivery Method:</strong> ${deliveryMethod.toUpperCase()}</p>

      <h3>Product Details</h3>
      <table>
        <thead>
          <tr>
            <th>QTY</th>
            <th>DESCRIPTION</th>
            <th>PRICE</th>
            <th>NET</th>
            <th>VAT</th>
            <th>GROSS</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      <div class="totals">
        <p><strong>Total NET:</strong> £${totals.totalNet.toFixed(2)}</p>
        <p><strong>Total VAT:</strong> £${totals.totalVat.toFixed(2)}</p>
        <p><strong>Total GROSS:</strong> £${totals.totalGross.toFixed(2)}</p>
        <p><strong>Payment Terms:</strong> 30 Days From Month End</p>
      </div>

      <div class="footer">
        Thank you for your business.<br>
        If you have any questions regarding this invoice, please reply to this email.
      </div>
    </div>
  </body>
  </html>
  `;
};
