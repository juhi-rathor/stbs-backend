// notificationPath.js

const BASE_ADMIN_URL = "http://localhost:3000";

const notificationPath = {
  overdueInvoices: `${BASE_ADMIN_URL}/dashboard/finance/invoices`,
  paymentReminder: `${BASE_ADMIN_URL}/invoices/payment-reminder`,
  stock: `${BASE_ADMIN_URL}/dashboard/stock`,
};

module.exports = notificationPath;
