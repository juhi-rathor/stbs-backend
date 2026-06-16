// validators/dispatch.schema.js
const Joi = require("joi");
const { isValidObjectId } = require("../utills/validationHelper");

const objectIdValidator = Joi.string().custom((value, helpers) => {
  if (!isValidObjectId(value)) return helpers.error("any.invalid");
  return value;
}, "ObjectId validation");

const createInvoiceSchema = Joi.object({
  salesOrderId: objectIdValidator.required().messages({
    "any.required": "salesOrderId is required",
    "any.invalid": "Invalid salesOrderId",
  }),
});

const getAllInvoicesSchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).optional(),

  query: Joi.string().optional().allow("", null),
  status: Joi.string().optional(),
  fromDate: Joi.string().optional().allow("", null),
  toDate: Joi.string().optional().allow("", null),
});
const getInvoicesByCustomerParamsSchema = Joi.object({
  customerId: Joi.string().hex().length(24).required().messages({
    "string.length": "Customer ID must be a valid 24-character hex string",
    "string.hex": "Customer ID must contain only hexadecimal characters",
  }),
});

// Validate Query Parameters (page, limit, filters)
const getInvoicesByCustomerQuerySchema = Joi.object({
  // Moved customerId here ⬇️
  customerId: Joi.string().hex().length(24).required().messages({
    "string.length": "Customer ID must be a valid 24-character hex string",
    "string.hex": "Customer ID must contain only hexadecimal characters",
    "any.required": "Customer ID is required",
  }),

  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).optional(),
  query: Joi.string().trim().optional().allow("", null),
  status: Joi.string().valid("paid", "pending").optional(),
  fromDate: Joi.date().iso().optional().allow("", null),
  toDate: Joi.date().iso().min(Joi.ref("fromDate")).optional().allow("", null),
});

module.exports = {
  createInvoiceSchema,
  getAllInvoicesSchema,
 getInvoicesByCustomerQuerySchema
};
