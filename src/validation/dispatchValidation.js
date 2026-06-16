// validators/dispatch.schema.js
const Joi = require("joi");
const { isValidObjectId } = require("../utills/validationHelper");

const objectIdValidator = Joi.string().custom((value, helpers) => {
  if (!isValidObjectId(value)) return helpers.error("any.invalid");
  return value;
}, "ObjectId validation");

const itemSchema = Joi.object({
  product: objectIdValidator.required().messages({
    "any.required": "product id is required",
    "any.invalid": "Invalid product id",
  }),
  qty: Joi.number().integer().min(1).required().messages({
    "number.base": "qty must be a number",
    "number.min": "qty must be at least 1",
    "any.required": "qty is required",
  }),
});

const createDispatchSchema = Joi.object({
  salesOrderId: objectIdValidator.required().messages({
    "any.required": "salesOrderId is required",
    "any.invalid": "Invalid salesOrderId",
  }),

  items: Joi.array().items(itemSchema).min(1).optional(),
  notes: Joi.string().max(1000).optional().allow("", null),
  deliveryMethod: Joi.string().optional(),
});

const confirmDispatchSchema = Joi.object({
  dispatchId: objectIdValidator.required().messages({
    "any.required": "dispatchId is required",
    "any.invalid": "Invalid dispatchId",
  }),
  vehicleNo: Joi.string().trim().min(1).max(100).optional().allow("", null),
  driverName: Joi.string().trim().min(1).max(100).optional().allow("", null),
});

const markDeliveredSchema = Joi.object({
  dispatchId: objectIdValidator.required().messages({
    "any.required": "dispatchId is required",
    "any.invalid": "Invalid dispatchId",
  }),
});

const cancelDispatchSchema = Joi.object({
  dispatchId: objectIdValidator.required().messages({
    "any.required": "dispatchId is required",
    "any.invalid": "Invalid dispatchId",
  }),
  // optional reason
  reason: Joi.string().max(1000).optional().allow("", null),
});

const getDispatchesSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .optional()
    .default(1),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(500)
    .optional()
    .default(10),

  status: Joi.string()
    // .valid("requested", "approved", "dispatched", "delivered", "cancelled")
    .optional(),

  search: Joi.string()
    .trim()
    .allow("", null)
    .optional(),

  fromDate: Joi.date()
    .iso()
    .optional(),

  toDate: Joi.date()
    .iso()
    .min(Joi.ref("fromDate"))
    .optional(),
});


const getDispatchByIdSchema = Joi.object({
  dispatchId: objectIdValidator.required().messages({
    "any.required": "dispatchId is required",
    "any.invalid": "Invalid dispatchId",
  }),
});

module.exports = {
  createDispatchSchema,
  confirmDispatchSchema,
  markDeliveredSchema,
  cancelDispatchSchema,
  getDispatchesSchema,
  getDispatchByIdSchema,
};
