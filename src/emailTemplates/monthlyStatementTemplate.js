module.exports.monthlyStatementTemplate = (
  customerName,
  businessName,
  invoices,
  month,
  year,
  logoUrl = "" // Base64 encoded image or path
) => {
  const monthName = new Date(year, month - 1).toLocaleString("en-GB", {
    month: "long",
  });

  const totalPaid = invoices.reduce((s, i) => s + (i.amountPaid || 0), 0);
  const totalDue = invoices.reduce((s, i) => s + (i.amountDue || 0), 0);

  const invoiceRows = invoices.map(i => `
<tr>
  <td>${i.invoiceNo}</td>
  <td>${new Date(i.invoiceDate).toLocaleDateString("en-GB")}</td>
  <td>${i.productCode || ""}</td>
  <td>${i.description || ""}</td>
  <td class="c">${i.qty || ""} ${i.qtyType || ""}</td>
  <td class="r">£${i.costPerPiece ? Number(i.costPerPiece).toFixed(2) : "0.00"}</td>
  <td class="c">${i.vat > 0 ? "Yes" : "No"}</td>
  <td class="r">£${i.net ? Number(i.net).toFixed(2) : "0.00"}</td>
  <td class="r">£${i.vat ? Number(i.vat).toFixed(2) : "0.00"}</td>
  <td class="r">£${i.gross ? Number(i.gross).toFixed(2) : "0.00"}</td>
  <td class="c">${i.isPaid ? "Yes" : "No"}</td>
  <td class="r">${i.amountPaid ? "£" + Number(i.amountPaid).toFixed(2) : "£0.00"}</td>
  <td class="r">${i.amountDue ? "-£" + Math.abs(Number(i.amountDue)).toFixed(2) : "£0.00"}</td>
</tr>
`).join("");

  return `
<!DOCTYPE html>
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

  .page {
    border: 1px solid #000;
    padding: 14px;
  }

  /* HEADER */
  .header {
    display: flex;
    gap: 14px;
    align-items: flex-start;
    margin-bottom: 12px;
  }

  .logo img {
    max-width: 120px;
    height: auto;
    display: block;
  }

  .company {
    font-size: 10px;
    line-height: 1.4;
  }

  .title {
    font-weight: 700;
    color: #003399;
    font-size: 12px;
    margin: 8px 0 10px;
  }

  /* TABLE */
  table {
    width: 100%;
    border-collapse: collapse;
  }

  th, td {
    border: 1px solid #000;
    padding: 4px 5px;
    vertical-align: top;
  }

  thead th {
    background: #cc0000;
    color: #fff;
    font-weight: 600;
    font-size: 10px;
  }

  tbody td {
    font-size: 8px;
  }

  .plain td {
    border: none;
    padding: 2px 0;
  }

  .r { text-align: left; }
  .c { text-align: center; }
  .s { text-align: left; }
  .section {
    margin-top: 10px;
  }

  /* FOOTER TEXT */
  .payment {
    font-size: 10px;
    line-height: 1.4;
  }
</style>
</head>

<body>

<div class="page">

  <!-- HEADER -->
  <div class="header">
    ${logoUrl ? `
    <div class="logo">
      <img src="${logoUrl}" alt="STBS Logo" />
    </div>
    ` : ''}

    </div>
    <div class="company">
      <strong>Specialist Tile & Building Material Ltd</strong><br/>
      40 Market Place<br/>
      Heckmondwike<br/>
      W.Yorks, WF16 0HT<br/><br/>
      Tel: (01924) 763272 | Email: info@stbs.uk<br/>
      VAT No: 464851075 | Company No. 15265320
    </div>

  <!-- TITLE -->
  <div class="title">MONTHLY STATEMENT</div>

  <!-- DETAILS -->
  <table class="plain">
    <tr>
      <td>
        <strong>Account Number:</strong> ${businessName.customerCode}<br/>
        <strong>For:</strong> ${businessName.businessName}<br/>
        ${businessName.email ? businessName.email + '<br/>' : ''}
        ${businessName.address || ""}
      </td>
      <td class="r">
        <strong>Month:</strong> ${monthName}<br/>
        <strong>Date Issued:</strong> ${new Date().toLocaleDateString("en-GB")}
      </td>
    </tr>
  </table>

  <!-- INVOICE TABLE -->
  <div class="section">
    <table>
      <thead>
        <tr>
          <th>Invoice Number</th>
          <th>Invoice Date</th>
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
        ${invoiceRows}
      </tbody>
    </table>
  </div>

  <!-- TOTALS -->
  <table class="plain section">
    <tr class="c">
      <td class="r"><strong>Total Paid</strong></td>
      <td class="s">£${totalPaid.toFixed(2)}</td>
    </tr>
    <tr class="c">
      <td class="r"><strong>Outstanding Balance:</strong></td>
      <td class="s">-£${Math.abs(totalDue).toFixed(2)}</td>
    </tr>
  </table>

  <!-- PAYMENT -->
  <div class="section payment">
    <strong class="title">Payment Instructions:</strong><br/>
    Account Name : Specialist Tiling & Building Supplies<br/>
    Account Number : 43799256<br/>
    Sort Code : 52-30-29<br/>
    Reference: Please use your account number or invoice number
  </div>

</div>

</body>
</html>
`;
};
