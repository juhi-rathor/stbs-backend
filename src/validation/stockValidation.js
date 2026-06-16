// validators/stock.schema.js
const Joi = require("joi");
const { isValidObjectId } = require("../utills/validationHelper");

// ObjectId validator
const objectIdValidator = Joi.string().custom((value, helpers) => {
  if (!isValidObjectId(value)) return helpers.error("any.invalid");
  return value;
}, "ObjectId validation");

const addStockSchema = Joi.object({
  productId: objectIdValidator.required().messages({
    "any.required": "productId is required",
    "any.invalid": "Invalid productId",
  }),

  qty: Joi.number().integer().min(1).required().messages({
    "number.base": "qty must be a number",
    "number.min": "qty must be at least 1",
    "any.required": "qty is required",  
  }),

  reference: Joi.string().trim().allow("", null),
});

const getAllStockSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(10),

  query: Joi.string().trim().allow("", null),

  sort: Joi.string().trim().default("createdAt"),

  sortType: Joi.string().trim().valid("asc", "desc").default("desc"),
});

const updateStockSchema = Joi.object({
  stockId: objectIdValidator.required().messages({
    "any.required": "stockId is required",
    "any.invalid": "Invalid stockId",
  }),

  goodsIn: Joi.number().integer().min(0).optional().messages({
    "number.base": "goodsIn must be a number",
    "number.min": "goodsIn cannot be negative",
  }),

  goodsOut: Joi.number().integer().min(0).optional().messages({
    "number.base": "goodsOut must be a number",
    "number.min": "goodsOut cannot be negative",
  }),

  reference: Joi.string().trim().allow("", null),
})
  .or("goodsIn", "goodsOut", "reference") // at least one must be provided
  .messages({
    "object.missing":
      "Provide at least one field to update (goodsIn, goodsOut, reference)",
  });

const deleteStockSchema = Joi.object({
  stockId: objectIdValidator.required().messages({
    "any.required": "stockId is required",
    "any.invalid": "Invalid stockId",
  }),
});

module.exports = {
  addStockSchema,
  getAllStockSchema,
  updateStockSchema,
  deleteStockSchema,
};
