module.exports.lowStockTemplate = ({
  productName,
  productCode,
  stockQty,
  warningLevel,
}) => `
  <div style="font-family: Arial; max-width:600px; margin:auto;">
    <h2 style="color:#c0392b;">Low Stock Alert</h2>

    <p>
      The stock level for the following product has reached or fallen below
      the warning threshold.
    </p>

    <table width="100%" border="1" cellspacing="0" cellpadding="8">
      <tr>
        <td><b>Product Name</b></td>
        <td>${productName}</td>
      </tr>
      <tr>
        <td><b>Product Code</b></td>
        <td>${productCode}</td>
      </tr>
      <tr>
        <td><b>Current Stock</b></td>
        <td>${stockQty}</td>
      </tr>
      <tr>
        <td><b>Warning Level</b></td>
        <td>${warningLevel}</td>
      </tr>
    </table>

    <p style="margin-top:16px;">
      Please reorder stock immediately to avoid order disruption.
    </p>

    <p>
      Regards,<br/>
      <strong>STBS System</strong>
    </p>
  </div>
`;
