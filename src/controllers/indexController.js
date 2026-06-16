const adminController = require("../controllers/adminController/adminAuthController");
const customerController = require("../controllers/adminController/customerController");
const productController = require("../controllers/adminController/productController");
const salesOrderController = require("../controllers/adminController/salesOrderController");
const dispatchController = require("../controllers/adminController/dispatchController");
const InvoiceController = require("../controllers/adminController/invoiceController");
const stockController = require("../controllers/adminController/stockController");
const financialController = require("../controllers/adminController/financialController");
const refundController = require("../controllers/adminController/refundContrller");
const notificationController = require("../controllers/adminController/notificationController");
const statementController = require("../controllers/adminController/statementController");
const emailTemplateController = require("../controllers/adminController/emailTemplateController");

module.exports.indexController = {
  adminController,
  customerController,
  productController,
  salesOrderController,
  dispatchController,
  InvoiceController,
  stockController,
  financialController,
  refundController,
  notificationController,
  statementController,
  emailTemplateController,
};
