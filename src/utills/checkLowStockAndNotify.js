const Notification = require("../models/notification.model");
const { sendLowStockMail } = require("../services/sendMail");
const notificationPath = require("../utills/notificationPath");

module.exports.checkLowStockAndNotify = async (product, adminId) => {
  console.log("low stock notify", product, adminId);
  // If no warning level set → ignore
  if (!product.lowStockWarning || product.lowStockWarning <= 0) return;

  if (
    product.stockQty <= product.lowStockWarning &&
    product.isLowStock === false
  ) {
    product.isLowStock = true;
    await product.save();

    await Notification.create({
      title: "Low Stock Alert",
      message: `Stock for ${product.productName} (${product.productCode}) has fallen to ${product.stockQty}. Please reorder.`,
      type: "stock_alert",
      adminId,
      recipientId: product._id,
      recipientType: "Stock",
      path: notificationPath.stock,
    });

    await sendLowStockMail({
      productName: product.productName,
      productCode: product.productCode,
      stockQty: product.stockQty,
      warningLevel: product.lowStockWarning,
      adminId,
    });
  }

  if (
    product.stockQty > product.lowStockWarning &&
    product.isLowStock === true
  ) {
    product.isLowStock = false;
    await product.save();
  }
};
