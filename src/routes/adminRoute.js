const express = require("express");
const router = express.Router();
const { indexController } = require("../controllers/indexController");
const {
  validateBody,
  validateQuery,
} = require("../middlewares/validateRequest");
const { verifyAdminToken } = require("../services/auth.service");
const {
  uploadProductImage,
  uploadCustomerExcel,
} = require("../services/multer");
const customerValidation = require("../validation/customervalidation");
const productValidation = require("../validation/productValidation");
const authValidation = require("../validation/authValidation");
const salesOrderValidation = require("../validation/salesOrderValidation");
const dispatchValidation = require("../validation/dispatchValidation");
const stockValidation = require("../validation/stockValidation");
const invoiceValidation = require("../validation/invoiceValidation");
const refundValidation = require("../validation/refundValidation");
const { validate } = require("../models/Admin.model");
/**================================Auth Routes================================= */
router.post(
  "/admin-login",
  validateBody(authValidation.adminLoginSchema),
  indexController.adminController.login
);

// router.use(verifyAdminToken());

router.get(
  "/get-admin-profile",
  verifyAdminToken(),
  indexController.adminController.viewProfile
);
router.post(
  "/change-password",
  verifyAdminToken(),
  validateBody(authValidation.changePasswordSchema),
  indexController.adminController.changePassword
);
router.put(
  "/update-admin-profile",
  verifyAdminToken(),
  validateBody(authValidation.updateAdminProfileSchema),
  indexController.adminController.updateProfile
);
router.get(
  "/get-freight-team-email",
  verifyAdminToken(),
  indexController.adminController.getFreightTeamEmail
);
router.put(
  "/update-freight-team-email",
  verifyAdminToken(),
  validateBody(authValidation.updateFreightTeamEmailSchema),
  indexController.adminController.updateFreightTeamEmail
);
router.post(
  "/forget-password",
  validateBody(authValidation.forgetPasswordSchema),
  indexController.adminController.forgotPassword
);
router.post(
  "/reset-password",
  validateBody(authValidation.resetPasswordSchema),
  indexController.adminController.resetPassword
);


/**================================Customer Routes================================= */

router.post(
  "/create-customer",
  validateBody(customerValidation.createCustomerSchema),
  verifyAdminToken(),
  indexController.customerController.createCustomer
);

router.get(
  "/check-customer-availability",
  verifyAdminToken(),
  validateQuery(customerValidation.checkCustomerAvailabilitySchema),
  indexController.customerController.checkCustomerAvailability
);

router.get(
  "/get-customer-by-id",
  verifyAdminToken(),
  indexController.customerController.getCustomerById
);

router.get(
  "/get-all-customer",
  verifyAdminToken(),
  validateQuery(customerValidation.getCustomersSchema),
  indexController.customerController.getAllCustomers
);

router.patch(
  "/update-customer",
  verifyAdminToken(),
  validateBody(customerValidation.updateCustomerSchema),
  indexController.customerController.updateCustomer
);

router.patch(
  "/change-customer-type",
  verifyAdminToken(),
  validateBody(customerValidation.switchCustomerTypeSchema),
  indexController.customerController.switchCustomerType
);

router.patch(
  "/archied-customer",
  verifyAdminToken(),
  validateBody(customerValidation.archiveCustomerSchema),
  indexController.customerController.archiveUnarchiveCustomer
);

router.get(
  "/search-customer",
  verifyAdminToken(),
  validateQuery(customerValidation.searchCustomerSchema),
  indexController.customerController.searchCustomer
);
router.patch(
  "/set-customer-due-date-day",
  // verifyAdminToken(),
  // validateBody(customerValidation.setCustomerDueDateDaySchema),
  indexController.customerController.setCustomerDueDateDay
);
/**================================Sales Routes================================= */

router.post(
  "/create-sales-order",
  verifyAdminToken(),
  validateBody(salesOrderValidation.createSalesOrderSchema),
  indexController.salesOrderController.createSalesOrder
);

router.get(
  "/get-all-sales-order",
  validateQuery(salesOrderValidation.getAllSalesOrdersSchema),
  indexController.salesOrderController.getAllSalesOrders
);
router.patch(
  "/update-sales-order",
  verifyAdminToken(),
  validateBody(salesOrderValidation.updateSalesOrderSchema),
  indexController.salesOrderController.updateSalesOrder
);

/**================================Product Routes================================= */

router.post(
  "/create-product",
  verifyAdminToken(),
  validateBody(productValidation.createProductSchema),
  indexController.productController.createProduct
);
router.post(
  '/add-product-details', verifyAdminToken(),
  validateBody(productValidation.AddProductDetailsSchema),
  indexController.productController.AddProductDetails)
router.post(
  "/add-product-batch",
  verifyAdminToken(),
  validateBody(productValidation.addProductBatchSchema),
  indexController.productController.addProductBatch
);
router.patch(
  "/update-product-batch",
  verifyAdminToken(),
  validateBody(productValidation.updateProductBatchSchema),
  indexController.productController.updateProductBatch
);
router.delete(
  "/delete-product-batch",
  verifyAdminToken(),
  validateQuery(productValidation.deleteProductBatchSchema),
  indexController.productController.deleteProductBatch
);
router.get(
  "/get-product-by-id",
  verifyAdminToken(),
  validateQuery(productValidation.getProductByIdSchema),
  indexController.productController.getProductById
);
router.get(
  "/get-all-product",
  verifyAdminToken(),
  validateQuery(productValidation.getAllProductsSchema),
  indexController.productController.getAllProducts
);
router.get(
  "/get-all-product-average",
  verifyAdminToken(),
  validateQuery(productValidation.getProductWithAvgSchema),
  indexController.productController.getProductWithAverage
);

router.post(
  "/upload-product-images",
  verifyAdminToken(),
  uploadProductImage,
  indexController.productController.uploadProductImages
);

router.patch(
  "/update-product",
  verifyAdminToken(),
  indexController.productController.updateProduct
);
/**================================dispatch Routes================================= */

router.post(
  "/create-dispatch",
  verifyAdminToken(),
  validateBody(dispatchValidation.createDispatchSchema),
  indexController.dispatchController.createDispatch
);

router.post(
  "/confirm-dispatch",
  verifyAdminToken(),
  validateBody(dispatchValidation.confirmDispatchSchema),
  indexController.dispatchController.confirmDispatch
);

router.get(
  "/mark-delivered",
  verifyAdminToken(),
  validateQuery(dispatchValidation.markDeliveredSchema),
  indexController.dispatchController.markDelivered
);

router.get(
  "/cancel-dispatch",
  verifyAdminToken(),
  validateQuery(dispatchValidation.cancelDispatchSchema),
  indexController.dispatchController.cancelDispatch
);

router.get(
  "/get-dispatch-by-id",
  verifyAdminToken(),
  validateQuery(dispatchValidation.getDispatchByIdSchema),
  indexController.dispatchController.getDispatchById
);

router.get(
  "/get-all-dispatches",
  verifyAdminToken(),
  validateQuery(dispatchValidation.getDispatchesSchema),
  indexController.dispatchController.getAllDispatches
);

/**================================invoice Routes================================= */

router.post(
  "/create-invoice",
  verifyAdminToken(),
  validateBody(invoiceValidation.createInvoiceSchema),
  indexController.InvoiceController.createInvoice
);

router.get(
  "/get-all-invoice",
  verifyAdminToken(),
  validateQuery(invoiceValidation.getAllInvoicesSchema),
  indexController.InvoiceController.getAllInvoices
);
router.get(
  "/get-invoice-by-customerId",
  verifyAdminToken(),
  validateQuery(invoiceValidation.getInvoicesByCustomerQuerySchema),
  indexController.InvoiceController.getInvoicesByCustomer
);

/**================================Stock Routes================================= */

router.post(
  "/add-stock-manually",
  verifyAdminToken(),
  validateBody(stockValidation.addStockSchema),
  indexController.stockController.addStock
);
router.post(
  "/add_stock_manually",
  verifyAdminToken(),
  validateBody(stockValidation.addStockSchema),
  indexController.stockController.addStock
);

router.patch(
  "/update-stock",
  verifyAdminToken(),
  validateBody(stockValidation.updateStockSchema),
  indexController.stockController.updateStock
);
router.delete(
  "/delete-stock",
  verifyAdminToken(),
  validateQuery(stockValidation.deleteStockSchema),
  indexController.stockController.deleteStock
);

router.get(
  "/get-all-stock",
  verifyAdminToken(),
  validateQuery(stockValidation.getAllStockSchema),
  indexController.stockController.getAllStock
);

/**================================financial Routes================================= */

router.post(
  "/make-payment",
  verifyAdminToken(),
  indexController.financialController.makePayment
);
router.post(
  "/create-noncash-adjustment",
  verifyAdminToken(),
  indexController.financialController.createNoncashAdjustment
);
router.get(
  "/get-customer-finance-history",
  verifyAdminToken(),
  indexController.financialController.getCustomerFinanceHistory
);
router.get(
  "/get-customer-finance-history-by-id",
  verifyAdminToken(),
  indexController.financialController.getCustomerFinanceHistory
);

router.get(
  "/get-all-customer-finance-history",
  verifyAdminToken(),
  indexController.financialController.getAllCustomerPayments
);

router.get(
  "/get-customer-upcoming-payments",
  verifyAdminToken(),
  indexController.financialController.getUpcomingPayments
);

router.get(
  "/get-customer-overdue-payments",
  verifyAdminToken(),
  indexController.financialController.getOverduePayments
);

router.post(
  "/send-payment-receipt",
  verifyAdminToken(),
  indexController.financialController.sendPaymentReceipt
);

/**================================refund Routes================================= */

router.post(
  "/refund-amount",
  verifyAdminToken(),
  validateBody(refundValidation.createRefundSchema),
  indexController.refundController.createRefund
);

router.get("/get-all-refund", indexController.refundController.getAllRefunds);

//notification routes

router.get(
  "/get-all-notification",
  verifyAdminToken(),
  indexController.notificationController.getAllNotifications
);

router.get(
  "/mark-read-notification",
  verifyAdminToken(),
  indexController.notificationController.markAsRead
);

/**================================statement Routes================================= */

router.post(
  "/send-monthly-statements",
  verifyAdminToken(),
  indexController.statementController.sendMonthlyStatementsManual
);


/**================================Email Template Routes================================= */

router.get(
  "/get-all-email-templates",
  verifyAdminToken(),
  indexController.emailTemplateController.getAllEmailTemplates
);

router.put(
  "/update-email-template",
  verifyAdminToken(),
  indexController.emailTemplateController.updateEmailTemplate
);

// One-time seed route — run once to populate templates in DB
router.post(
  "/seed-email-templates",
  verifyAdminToken(),
  indexController.emailTemplateController.seedTemplates
);

router.post(
  "/bulk-upload-customers",
  verifyAdminToken(),
  uploadCustomerExcel,
  indexController.customerController.bulkUploadCustomers
);

module.exports = router;

