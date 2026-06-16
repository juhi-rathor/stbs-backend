module.exports.EmailReminder1 = (
  customerName,
  invoiceNo,
  amount
) => `
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #000; font-size: 14px;">

 
 

  <p>
    Good Morning/Afternoon,
  </p>

  <p>
    Hope you’re well. This is a gentle reminder that
    <strong>Invoice ${invoiceNo}</strong> for
    <strong>£${amount}</strong> appears to remain unpaid.
  </p>

  <p>
    We would appreciate it if you could arrange settlement at your earliest
    convenience. For your reference, a copy of the invoice is attached.
  </p>

  <p>
    <strong>Our bank details are as follows:</strong><br>
    Account Name: Specialist Tiling &amp; Building Supplies Ltd<br>
    Account Number: 43799256<br>
    Sort Code: 52-30-29
  </p>

  <p>
    If payment has already been made, please disregard this message and accept
    our apologies for any inconvenience.
  </p>

  <p>
    Thank you for your prompt attention to this matter.
  </p>

  <p>
    Kind Regards,<br>
   
  </p>

</div>
`;
