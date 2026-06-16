// validators/adminAuth.schema.js
const Joi = require("joi");

const adminLoginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.empty": "Email is required",
    "string.email": "Email must be a valid email address",
  }),

  password: Joi.string().required().messages({
    "string.empty": "Password is required",
  }),
  deviceToken: Joi.string().optional().allow("", null),
});

const forgetPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.empty": "Email is required",
    "string.email": "Email must be a valid email address",
  }),
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required().messages({
    "string.empty": "Reset link (token) is required",
  }),

  password: Joi.string().min(6).required().messages({
    "string.min": "Password must be at least 6 characters long",
    "string.empty": "Password is required",
  }),
});

const changePasswordSchema = Joi.object({
  oldPassword: Joi.string().required().messages({
    "string.empty": "Old password is required",
  }),

  newPassword: Joi.string().min(6).required().messages({
    "string.empty": "New password is required",
    "string.min": "New password must be at least 6 characters long",
  }),
});

const updateAdminProfileSchema = Joi.object({
  name: Joi.string().trim().min(1).optional().messages({
    "string.empty": "Name cannot be empty",
  }),

  email: Joi.forbidden().messages({
    "any.unknown": "Email cannot be updated",
  }),
});

const updateFreightTeamEmailSchema = Joi.object({
  freightTeamEmail: Joi.string().email().required().messages({
    "string.empty": "Freight team email is required",
    "string.email": "Freight team email must be a valid email",
  }),
});

module.exports = {
  adminLoginSchema,
  forgetPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateAdminProfileSchema,
  updateFreightTeamEmailSchema,
};
