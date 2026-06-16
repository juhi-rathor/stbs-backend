// validators/product.schema.js
const Joi = require("joi");
const { isValidObjectId } = require("../utills/validationHelper");

const objectIdValidator = Joi.string().custom((value, helpers) => {
  if (!isValidObjectId(value)) return helpers.error("any.invalid");
  return value;
}, "ObjectId validation");

const createProductSchema = Joi.object({
  productCode: Joi.string().optional().allow("", null),
  productName: Joi.string().trim().min(2).max(200).required().messages({
    "string.empty": "productName is required",
    "any.required": "productName is required",
  }),
  description: Joi.string().trim().allow("", null).optional(),
  unit: Joi.string().trim().allow("", null).optional(),
  size: Joi.string().trim().allow("", null).optional(),
  productImage: Joi.array().items(Joi.string()).optional(),
  containerNo: Joi.string().trim().allow("", null).optional(),
}); 
const AddProductDetailsSchema =Joi.object({
  id: objectIdValidator.required().messages({
    "any.required": "Id is required",
    "any.invalid": "Invalid Id",
  }),
  qtyPerPallet:Joi.number().min(0).required(),
  PricePerBoard:Joi.number().min(0).required(),
  PricePerPallet:Joi.number().min(0).required(),
 
  lowStockWarning: Joi.number().min(0).optional().default(0),
  description: Joi.string().trim().allow("", null),

  unit: Joi.string().trim().optional(),

  size: Joi.string().trim().allow("", null),

  productImage: Joi.array().items(Joi.string()).optional(),
}) 

const addProductBatchSchema = Joi.object({
  productId: objectIdValidator.required().messages({
    "any.required": "productId is required",
    "any.invalid": "Invalid productId",
  }),
  productCode: Joi.string().trim().allow("", null).optional(),
  containerNo: Joi.string().trim().allow("", null).optional(),
  receivedQty: Joi.number().integer().min(1).optional(),
  receivedPalletQty: Joi.number().integer().min(1).optional(),
  purchasePrice: Joi.number().min(0).required().messages({
    "number.base": "purchasePrice must be a number",
    "any.required": "purchasePrice is required",
  }),
  shippingCharges: Joi.number().min(0).optional().default(0),
  exciseDuty: Joi.number().min(0).optional().default(0),
  vatRate: Joi.number().min(0).optional().default(0),
}).or("receivedQty", "receivedPalletQty");

const updateProductBatchSchema = Joi.object({
  productId: objectIdValidator.required().messages({
    "any.required": "productId is required",
    "any.invalid": "Invalid productId",
  }),

  batchNo: Joi.string().trim().required().messages({
    "any.required": "batchNo is required",
    "string.empty": "batchNo is required",
  }),

  receivedPalletQty: Joi.number().min(1).optional().messages({
    "number.base": "receivedPalletQty must be a number",
    "number.min": "receivedPalletQty must be at least 1",
  }),

  purchasePrice: Joi.number().min(0).optional(),
  shippingCharges: Joi.number().min(0).optional(),
  exciseDuty: Joi.number().min(0).optional(),
  vatRate: Joi.number().min(0).optional(),
  containerNo: Joi.string().trim().allow("", null),
})
  .or(
    "receivedPalletQty",
    "purchasePrice",
    "shippingCharges",
    "exciseDuty",
    "vatRate",
    "containerNo"
  )
  .messages({
    "object.missing":
      "Provide at least one field to update (receivedPalletQty, purchasePrice, shippingCharges, exciseDuty, vatRate, containerNo)",
  });

const deleteProductBatchSchema = Joi.object({
  productId: objectIdValidator.required().messages({
    "any.required": "productId is required",
    "any.invalid": "Invalid productId",
  }),

  batchNo: Joi.string().trim().required().messages({
    "any.required": "batchNo is required",
    "string.empty": "batchNo is required",
  }),
});

const getProductByIdSchema = Joi.object({
  productId: objectIdValidator.required().messages({
    "any.required": "productId is required",
    "any.invalid": "Invalid productId",
  }),
});

const getAllProductsSchema = Joi.object({
  query: Joi.string().trim().allow("", null),

  sort: Joi.string().trim().optional().default("createdAt"),

  sortType: Joi.string().valid("asc", "desc").optional().default("desc"),

  limit: Joi.number().integer().min(1).max(1000).optional().default(10),

  page: Joi.number().integer().min(1).optional().default(1),

  isActive: Joi.alternatives()
    .try(Joi.boolean(), Joi.string().valid("true", "false"))
    .optional(),
    
  isDetails: Joi.boolean().allow(true, false), 
});

const getProductWithAvgSchema = Joi.object({
  productId: objectIdValidator.required().messages({
    "any.required": "productId is required",
    "any.invalid": "Invalid productId",
  }),
});

module.exports = {
  createProductSchema,
  addProductBatchSchema,
  updateProductBatchSchema,
  deleteProductBatchSchema,
  getProductByIdSchema,
  getAllProductsSchema,
  AddProductDetailsSchema,
  getProductWithAvgSchema,
};
