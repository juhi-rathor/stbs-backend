// src/routes/index.js
const express = require("express");
const router = express.Router();
const adminRoute = require("./adminRoute");
const emailLogRoute = require("./emailLog.route");

router.use("/admin", adminRoute);
router.use("/email-log", emailLogRoute);
// console.log("adminRoutes =>", adminRoute);

module.exports = router;
