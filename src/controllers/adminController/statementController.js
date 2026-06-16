const catchAsync = require("../../utills/catchAsync");
const AppError = require("../../utills/AppError");
const { sendMonthlyStatementsToAll } = require("../../crons/monthlyStatementCron");

// Send monthly statements to all customers
exports.sendMonthlyStatementsManual = catchAsync(async (req, res) => {
  try {
    const result = await sendMonthlyStatementsToAll();

    res.status(200).json({
      success: true,
      message: "Monthly statements sent successfully",
      data: result,
    });
  } catch (error) {
    throw new AppError(error.message || "Failed to send statements", 500);
  }
});
