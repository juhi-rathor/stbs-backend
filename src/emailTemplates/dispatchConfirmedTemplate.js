module.exports.dispatchConfirmedTemplate = ({
  customerName,
  orderNo,
  invoiceNo,
  dispatchDate,
  vehicleNo,
  driverName,
}) => `
  <div style="font-family: Arial; line-height: 1.6; color: #000;">
    
    <p>Dear ${customerName},</p>

    <p>
      We are pleased to inform you that your order 
      <strong>${orderNo}</strong> has been successfully 
      <strong>dispatched</strong>.
    </p>

    <p><strong>Dispatch Details:</strong></p>
    <ul>
      <li><strong>Invoice No:</strong> ${invoiceNo}</li>
      <li><strong>Dispatch Date:</strong> ${dispatchDate}</li>
    
    </ul>

    <p>
      Your order is on the way and will be delivered as per the agreed
      delivery schedule.
    </p>

    <p>
      If you have any questions, feel free to contact us.
    </p>

    <p>
      Kind regards,<br>
      <strong>STBS Ltd</strong>
    </p>

  </div>
`;
