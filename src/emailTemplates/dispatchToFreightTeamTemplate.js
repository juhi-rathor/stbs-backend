const formatAddress = (addr) => {
  if (!addr) return "";

  return `
    ${addr.line1 || ""}<br>
    ${addr.line2 || ""}<br>
    ${addr.city || ""}, ${addr.state || ""} 
  `;
};

module.exports.dispatchToFreightTeamTemplate = (
  dispatchNumber,
  customer,
  items,
  deliveryMethod,
  notes
) => {
  const productList = items
    .map(
      (i) => `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${i.qtyLabel || i.qty}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${i.productName}</td>
        </tr>
      `
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Dispatch Request</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                background-color: #f4f4f4;
                padding: 40px;
                text-align: center;
            }
            .container {
                background: #fff;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0px 0px 10px rgba(0,0,0,0.1);
                max-width: 600px;
                margin: auto;
                text-align: left;
            }
            .header {
                font-size: 20px;
                font-weight: bold;
                margin-bottom: 10px;
                color: #333;
            }
            .sub-header {
                font-size: 16px;
                margin-bottom: 20px;
                color: #555;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 15px;
            }
            .btn {
                display: inline-block;
                padding: 10px 20px;
                margin-top: 25px;
                background-color: #007bff;
                color: #fff !important;
                text-decoration: none;
                border-radius: 5px;
            }
            .footer {
                margin-top: 20px;
                font-size: 14px;
                color: #777;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">DISPATCH REQUEST - ${dispatchNumber}</div>
            <div class="sub-header">Dear Freight Team, please arrange dispatch of the following order:</div>

            <p><strong>Customer Name:</strong> ${customer.businessName}</p>
            <p><strong>Customer Delivery Address:</strong> ${formatAddress(
              customer.deliveryAddress
            )}:</strong> </p>
            <p><strong>Customer Primary Telephone:</strong> ${
              customer.primaryPhone || "N/A"
            }</p>
            <p><strong>Customer Secondary Telephone:</strong> ${
              customer.secondaryPhone || "N/A"
            }</p>

            <h3>Product Details</h3>
            <table>
                <thead>
                    <tr>
                        <th style="padding: 8px; border: 1px solid #ddd;">Qty</th>
                        <th style="padding: 8px; border: 1px solid #ddd;">Product</th>
                    </tr>
                </thead>
                <tbody>
                    ${productList}
                </tbody>
            </table>

            <p><strong>Delivery Method:</strong> ${deliveryMethod.toUpperCase()}</p>
            <div style="margin-top: 15px; padding: 15px; background-color: #fff3cd; border-left: 5px solid #ffc107; border-radius: 4px; color: #856404;">
              <strong style="display:block; margin-bottom: 5px;">Notes:</strong>
              ${notes || "N/A"}
            </div>

            <p class="footer">Please confirm once the shipment has been scheduled for delivery.</p>
        </div>
    </body>
    </html>
  `;
};
