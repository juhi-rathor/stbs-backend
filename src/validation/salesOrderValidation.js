// validators/salesOrder.schema.js
const Joi = require("joi");
const { isValidObjectId } = require("../utills/validationHelper");

// Validate ObjectId
const objectIdValidator = Joi.string().custom((value, helpers) => {
  if (!isValidObjectId(value)) return helpers.error("any.invalid");
  return value;
}, "ObjectId validation");

// ITEM SCHEMA
const itemSchema = Joi.object({
  product: objectIdValidator.required().messages({
    "any.required": "product id is required",
    "any.invalid": "Invalid product id",
  }),

  // New field added
  qtyType: Joi.string().valid("pallet", "board").default("pallet").messages({
    "any.only": "qtyType must be either 'pallet' or 'board'",
    "string.base": "qtyType must be a string",
  }),

  qty: Joi.number().integer().min(1).optional().messages({
    "number.base": "palletQty must be a number",
    "number.min": "palletQty must be at least 1",
  }),

  // boardQty: Joi.number().integer().min(1).optional().messages({
  //   "number.base": "boardQty must be a number",
  //   "number.min": "boardQty must be at least 1",
  // }),

  unitPrice: Joi.number().min(0).required().messages({
    "number.base": "unitPrice must be a number",
    "any.required": "unitPrice is required",
  }),

  discount: Joi.number().min(0).optional().default(0),
});


/* ----------------------------------------------------
   CREATE SALES ORDER
----------------------------------------------------- */
const createSalesOrderSchema = Joi.object({
  customerId: objectIdValidator.required().messages({
    "any.required": "customerId is required",
    "any.invalid": "Invalid customerId",
  }),
  customerOrderNo: Joi.string().trim().allow("", null).optional(),
  purchaseOrderNo: Joi.string().trim().allow("", null).optional(),
  deliveryAddress: Joi.string().trim().allow("", null).optional(),
  deliveryMethod: Joi.string()
    .valid("express", "eco", "collection")
    .required()
    .messages({
      "any.only": "deliveryMethod must be Express, Eco or Collection",
      "any.required": "deliveryMethod is required (Express/Eco/Collection)",
    }),

  items: Joi.array().items(itemSchema).min(1).required().messages({
    "array.min": "At least 1 item is required",
    "any.required": "items are required",
  }),

  notes: Joi.string().trim().allow("", null),
});

const updateSalesOrderSchema = Joi.object({
  customerId: objectIdValidator.optional().messages({
    "any.invalid": "Invalid customerId",
  }),
  salesOrderId: objectIdValidator.required().messages({
    "any.required": "salesOrderId is required",
    "any.invalid": "Invalid salesOrderId",
  }),
  customerOrderNo: Joi.string().trim().allow("", null).optional(),
  purchaseOrderNo: Joi.string().trim().allow("", null).optional(),
  deliveryAddress: Joi.string().trim().allow("", null).optional(),
  item:Joi.array().items(itemSchema).min(1).optional(),
  vatAmount: Joi.number().min(0).optional(),
  totalAmount: Joi.number().min(0).optional(),
  notes: Joi.string().trim().allow("", null).optional(),
  deliveryMethod: Joi.string().trim().allow("", null).optional(),
  items: Joi.array().items(itemSchema).min(1).optional(),
});

const getSalesOrderByIdSchema = Joi.object({
  salesOrderId: objectIdValidator.required().messages({
    "any.required": "salesOrderId is required",
    "any.invalid": "Invalid salesOrderId",
  }),
});

const getAllSalesOrdersSchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(200).optional().default(10),
  query: Joi.string().trim().allow("", null),
  sortField: Joi.string().trim().optional().default("createdAt"),
  sortOrder: Joi.string().valid("asc", "desc").optional().default("desc"),
  fromDate: Joi.date().iso().optional(),
  toDate: Joi.date().iso().optional(),
  paymentStatus: Joi.string().valid("pending", "partial", "paid","refunded").optional(),
  status: Joi.string()
    .valid(
      "created",
      "approved",
      "dispatched",
      "invoiced",
      "cancelled",
      "delivered",
      "requested"
    )
    .optional(),
});

module.exports = {
  createSalesOrderSchema,
  updateSalesOrderSchema,
  getSalesOrderByIdSchema,
  getAllSalesOrdersSchema,
};
