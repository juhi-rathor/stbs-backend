module.exports.EmailReminder3 = (
  customerName,
  invoiceNo,
  finalDate,
  amount
) => `
<p>Dear ${customerName},</p>

<p>Despite previous reminders, payment for invoice <strong>${invoiceNo}</strong> for 
<strong>£${amount}</strong> remains outstanding and is now 
<strong>21 days overdue</strong>.</p>

<p>If your payment is not received in next 3 working days,Your future credit terms may be affected.</p>

<p>This is your <strong>final reminder</strong>. Please treat this matter with urgency.</p>

<p>Sincerely,<br>
STBS Ltd</p>
`;
