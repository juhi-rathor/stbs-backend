// src/controllers/stbsNotificationController.js
const catchAsync = require("../../utills/catchAsync");
const AppError = require("../../utills/AppError");
const Notification = require("../../models/notification.model");

const getAllNotifications = catchAsync(async (req, res, next) => {
  const admin = req.admin;

  if (!admin) {
    return next(new AppError("Unauthorized", 401));
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    Notification.find({ adminId: admin._id })
      .populate({
        path: "recipientId",
        select: "invoiceNo customer salesOrderNumber customerId businessName customerCode", // Cover fields across Invoice, Order, and Customer
        populate: [
          {
            path: "customer", // Used by Invoice
            select: "businessName customerCode",
            strictPopulate: false,
          },
          {
            path: "customerId", // Used by Order
            select: "businessName customerCode",
            strictPopulate: false,
          }
        ],
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),

    Notification.countDocuments({ adminId: admin._id }),
  ]);

  return res.ok(
    {
      notifications,
      total,
      page,
      limit,
    },
    "Notifications fetched successfully ✅"
  );
});

// PATCH /api/v1/notifications/:id/read
const markAsRead = catchAsync(async (req, res, next) => {
  const admin = req.admin;
  const { notificationId } = req.query;

  if (!admin) {
    return next(new AppError("Unauthorized", 401));
  }

  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, adminId: admin._id },
    { status: "read" },
    { new: true }
  );

  if (!notification) {
    return next(new AppError("Notification not found", 404));
  }

  return res.ok(notification, "Notification marked as read ✅");
});

module.exports = {
  getAllNotifications,
  markAsRead,
};
