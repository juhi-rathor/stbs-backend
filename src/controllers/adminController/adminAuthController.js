const bcrypt = require("bcryptjs");
const { catchAsync } = require("../../utills/response");
const AppError = require("../../utills/AppError");
const Admin = require("../../models/Admin.model");
const { assignJwt } = require("../../services/auth.service");
const { forgetPasswordMail } = require("../../services/sendMail");
const jwt = require("jsonwebtoken");
const env = require("../../config/envConfig");

// const login = catchAsync(async (req, res) => {
//   const { email, password,deviceToken } = req.body;

//   console.log("email password", email, password);
//   if (!email || !password) {
//     throw new AppError("Email and password are required", 400);
//   }

//   const admin = await Admin.findOne({ email });
//   console.log("admin", admin);

//   if (!admin) {
//     throw new AppError("Invalid email or password", 401);
//   }

//   const isMatch = await bcrypt.compare(password, admin.passwordHash);
//   if (!isMatch) {
//     throw new AppError("Invalid email or password", 401);
//   }

//   if (!admin.isActive) {
//     throw new AppError("Account is not active", 403);
//   }

//   const payload = {
//     _id: admin._id,
//     email: admin.email,
//     role: admin.role,
//   };

//   const token = assignJwt(payload);

//   const cleanAdmin = admin.toObject();
//   delete cleanAdmin.passwordHash;

//   res.ok({ admin: cleanAdmin, token }, "Logged in successfully");
// });

const login = catchAsync(async (req, res) => {
  const { email, password, deviceToken } = req.body;

  if (!email || !password) {
    throw new AppError("Email and password are required", 400);
  }

  const admin = await Admin.findOne({ email });

  if (!admin) {
    throw new AppError("Invalid email or password", 401);
  }

  const isMatch = await bcrypt.compare(password, admin.passwordHash);
  if (!isMatch) {
    throw new AppError("Invalid email or password", 401);
  }

  if (!admin.isActive) {
    throw new AppError("Account is not active", 403);
  }

  if (deviceToken && admin.deviceToken !== deviceToken) {
    admin.deviceToken = deviceToken;
    await admin.save();
  }

  const payload = {
    _id: admin._id,
    email: admin.email,
  };

  const token = assignJwt(payload);

  const cleanAdmin = admin.toObject();
  delete cleanAdmin.passwordHash;

  return res.ok({ admin: cleanAdmin, token }, "Logged in successfully");
});

const viewProfile = catchAsync(async (req, res) => {
  const admin = await Admin.findById(req.admin._id).select("-passwordHash");

  if (!admin) throw new AppError("Admin not found", 404);

  res.ok(admin, "Admin details fetched");
});

const changePassword = catchAsync(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const admin = req.admin;

  if (!oldPassword || !newPassword) {
    throw new AppError("Old and new password required", 400);
  }

  const isMatch = await bcrypt.compare(oldPassword, admin.passwordHash);
  if (!isMatch) throw new AppError("Old password incorrect", 400);

  admin.passwordHash = await bcrypt.hash(newPassword, 10);
  await admin.save();

  res.ok({}, "Password changed successfully");
});

const updateProfile = catchAsync(async (req, res) => {
  const admin = await Admin.findById(req.admin._id);
  if (!admin) throw new AppError("Admin not found", 404);

  if (req.body.email) delete req.body.email; // Prevent email edit

  const updated = await Admin.findByIdAndUpdate(admin._id, req.body, {
    new: true,
    runValidators: true,
  });

  res.ok(updated, "Profile updated successfully");
});

const forgotPassword = catchAsync(async (req, res) => {
  const { email } = req.body;

  if (!email) throw new AppError("Email required", 400);

  const admin = await Admin.findOne({ email });
  if (!admin) throw new AppError("Admin not found", 404);

  const payload = {
    _id: admin._id,
    email: admin.email,
  };

  const token = assignJwt(payload);
  const resetLink = `${process.env.FORGET_PASSWORD_LINK}/${token}`;
  console.log("resetPasswordLink", resetLink);

  await forgetPasswordMail(email, admin.name, resetLink);

  res.ok({ token }, "Password reset link sent");
});

const resetPassword = catchAsync(async (req, res) => {
  const { token, password } = req.body;

  let decoded;
  try {
    decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
  } catch (_) {
    
    throw new AppError("Invalid or expired reset link", 400);
  }

  const admin = await Admin.findById(decoded._id);
  if (!admin) throw new AppError("Admin not found", 404);

  admin.passwordHash = await bcrypt.hash(password, 10);
  await admin.save();

  res.ok({}, "Password reset successfully");
});



const getFreightTeamEmail = catchAsync(async (req, res) => {
  const admin = await Admin.findById(req.admin._id).select("freightTeamEmail");
  if (!admin) throw new AppError("Admin not found", 404);

  const fallbackEmail = process.env.FREIGHT_TEAM_EMAIL?.trim() || null;
  res.ok(
    { freightTeamEmail: admin.freightTeamEmail || fallbackEmail },
    "Freight team email fetched"
  );
});

const updateFreightTeamEmail = catchAsync(async (req, res) => {
  const admin = await Admin.findById(req.admin._id);
  if (!admin) throw new AppError("Admin not found", 404);

  admin.freightTeamEmail = req.body.freightTeamEmail.trim().toLowerCase();
  await admin.save();

  res.ok(
    { freightTeamEmail: admin.freightTeamEmail },
    "Freight team email updated successfully"
  );
});

// const logout = catchAsync(async (_, res) => {
//   res.ok({}, "Logged out");
// });

module.exports = {
  login,
  viewProfile,
  updateProfile,
  forgotPassword,
  resetPassword,
  changePassword,
  getFreightTeamEmail,
  updateFreightTeamEmail,
  //   logout,
};
