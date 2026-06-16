// validators/customer.schema.js
const Joi = require("joi");
const { isValidObjectId } = require("../utills/validationHelper");

const indianPhoneRegex = /^[6-9]\d{9}$/;

const addressSchema = Joi.object({
  line1: Joi.string().trim().allow("", null),
  line2: Joi.string().trim().allow("", null),
  city: Joi.string().trim().allow("", null),
  state: Joi.string().trim().allow("", null),
  postcode: Joi.string().trim().allow("", null),
});

const createCustomerSchema = Joi.object({
  businessName: Joi.string().trim().min(2).max(200).required().messages({
    "string.base": "businessName must be a string",
    "string.empty": "businessName is required",
    "string.min": "businessName should have at least 2 characters",
    "any.required": "businessName is required",
  }),
  name: Joi.string().trim().min(1).max(100).optional().allow("", null),
  phone: Joi.string().required().messages({
    "string.empty": "phone is required",
    "any.required": "phone is required",
  }),
  secondaryPhone: Joi.string().optional().allow("", null),
  email: Joi.string()
    .trim()
    .lowercase()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.email": "Please enter a valid email address",
      "any.required": "Email is required",
    }),
  correspondenceAddress: addressSchema.required().messages({
    "any.required": "correspondenceAddress is required",
  }),
  deliveryAddress: addressSchema.required().messages({
    "any.required": "deliveryAddress is required",
  }),
  customerType: Joi.string().valid("CC", "PC").required().messages({
    "any.only": "customerType must be either 'CC' or 'PC'",
    "any.required": "customerType is required",
  }),
  creditLimit: Joi.number().min(0).optional().default(0),
  category: Joi.string()
    .valid("trade", "retail", "vip", "cash")
    .optional()
    .default("trade"),
});

const checkCustomerAvailabilitySchema = Joi.object({
  email: Joi.string()
    .trim()
    .lowercase()
    .email({ tlds: { allow: false } })
    .optional(),
  primaryPhone: Joi.string().trim().optional(),
}).or("email", "primaryPhone");

const updateCustomerSchema = Joi.object({
  customerId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.empty": "Customer ID is required",
      "string.pattern.base": "Invalid Customer ID format",
    }),
  businessName: Joi.string().trim().min(2).max(200).optional(),
  name: Joi.string().trim().min(1).max(100).optional().allow("", null),
  customerCode: Joi.string().trim().optional(),
  primaryPhone: Joi.string().optional().allow("", null),
  phone: Joi.string().optional().allow("", null),
  secondaryPhone: Joi.string().optional().allow("", null),
  email: Joi.string()
    .trim()
    .lowercase()
    .email({ tlds: { allow: false } })
    .optional(),
  correspondenceAddress: addressSchema.optional(),
  deliveryAddress: addressSchema.optional(),
  customerType: Joi.string().valid("CC", "PC").optional(),
  creditLimit: Joi.number().min(0).optional(),
  category: Joi.string().valid("trade", "retail", "vip", "cash").optional(),
});

const getCustomersSchema = Joi.object({
  query: Joi.string().allow("", null),
  sort: Joi.string().optional().default("createdAt"),
  sortType: Joi.string().valid("asc", "desc").optional().default("desc"),
  limit: Joi.number().integer().min(1).max(200).optional().default(10),
  page: Joi.number().integer().min(1).optional().default(1),
  isArchived: Joi.boolean().optional(),
});

const searchCustomerSchema = Joi.object({
  query: Joi.string().required().messages({
    "string.empty": "Search query is required",
  }),
  page: Joi.number().integer().min(1).optional(),
});

const switchCustomerTypeSchema = Joi.object({
  customerId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.empty": "Landlord ID is required",
      "string.pattern.base": "Invalid Landlord ID format",
    }),
});

const archiveCustomerSchema = Joi.object({
  customerId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "string.empty": "Landlord ID is required",
      "string.pattern.base": "Invalid Landlord ID format",
    }),
});

module.exports = {
  createCustomerSchema,
  checkCustomerAvailabilitySchema,
  updateCustomerSchema,
  getCustomersSchema,
  searchCustomerSchema,
  switchCustomerTypeSchema,
  archiveCustomerSchema,
};
