// validators/refund.schema.js
const Joi = require("joi");
const { isValidObjectId } = require("../utills/validationHelper");

const objectId = Joi.string().custom((value, helpers) => {
  if (!isValidObjectId(value)) return helpers.error("any.invalid");
  return value;
}, "ObjectId validation");

const createRefundSchema = Joi.object({
  customerId: objectId.required().messages({
    "any.required": "customerId is required",
    "any.invalid": "Invalid customerId",
  }),

  invoiceId: objectId.optional().allow(null, "").messages({
    "any.invalid": "Invalid invoiceId",
  }),

  refundAmount: Joi.number().min(1).required().messages({
    "number.base": "refundAmount must be a number",
    "number.min": "refundAmount must be greater than 0",
    "any.required": "refundAmount is required",
  }),

  reason: Joi.string().trim().allow("", null),

  paymentMethod: Joi.string()
    .valid("cash", "bank", "card", "cheque", "transfer")
    .required()
    .messages({
      "any.only": "Invalid payment method",
      "any.required": "paymentMethod is required",
    }),
});

module.exports = {
  createRefundSchema,
};
