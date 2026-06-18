module.exports.paymentReceiptTemplate = ({ customer, invoice, payment }) => {
  const isFullPaid = invoice ? invoice.amountDue <= 0 : false;

  return `
  <div style="font-family: Arial; max-width:600px; margin:auto;">
    <h2>Payment Receipt</h2>

    <p>Hello <b>${customer.businessName}</b>,</p>

    <p>We have received your payment. Below are the details:</p>

    <table width="100%" border="1" cellspacing="0" cellpadding="8">
      <tr>
        <td><b>Invoice No</b></td>
        <td>${invoice ? invoice.invoiceNo : "N/A"}</td>
      </tr>
      <tr>
        <td><b>Total Invoice Amount</b></td>
        <td>£${invoice ? invoice.gross : "N/A"}</td>
      </tr>
      <tr>
        <td><b>Amount Paid</b></td>
        <td>£${payment.credit}</td>
      </tr>
      <tr>
        <td><b>Payment Method</b></td>
        <td>${payment.paymentMethod}</td>
      </tr>
      <tr>
        <td><b>Reference No</b></td>
        <td>${payment.referenceNo || "N/A"}</td>
      </tr>
      <tr>
        <td><b>Payment Date</b></td>
        <td>${new Date(payment.transactionDate).toDateString()}</td>
      </tr>
    </table>
    <br/>
    ${
      invoice
        ? isFullPaid
          ? `<p style="color:green;"><b>✅ Invoice Fully Paid</b></p>`
          : `<p style="color:orange;">
               Partial Payment Received<br/>
              <b>Remaining Amount Due: £${invoice.amountDue}</b>
             </p>`
        : `<p style="color:green;"><b>Payment credited to account balance.</b></p>`
    }
    <p>Thank you for your business.</p>
    <p>Regards,<br/>Accounts Team</p>
  </div>
  `;
};
