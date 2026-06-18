const Customer = require("../../models/customer.model");
const salesOrder=require("../../models/salesOrder.model")
const Invoice=require("../../models/invoice.model")
const adminModal = require("../../models/Admin.model");
const AppError = require("../../utills/AppError");
const catchAsync = require("../../utills/catchAsync");
const { isValidObjectId } = require("../../utills/validationHelper");
const Counter = require("../../models/counter.model");
const salesOrderModel = require("../../models/salesOrder.model");
const xlsx = require("xlsx");
const fs = require("fs");

async function generateCustomerCode() {
  let counter = await Counter.findOne({ name: "customer" });

  if (counter && counter.seq < 1000) {
    counter.seq = 1000;
    await counter.save();
  }

  if (!counter) {
    counter = await Counter.create({ name: "customer", seq: 1000 });
  }

  counter = await Counter.findOneAndUpdate(
    { name: "customer" },
    { $inc: { seq: 1 } },
    { new: true }
  );

  return `STBS${counter.seq}`;
}
// async function generateCustomerCode() {
//   // Example prefix STBS
//   const prefix = 'STBS';
//   // find last UCC
//   const last = await Customer.findOne({ ucc: new RegExp(`^${prefix}`) }).sort({ createdAt: -1 }).lean();
//   if(!last) return `${prefix}1001`;
//   const num = parseInt(last.ucc.replace(prefix, ''), 10) || 1000;
//   return `${prefix}${num + 1}`;
// }

// const createCustomer = catchAsync(async (req, res) => {
//   const adminId = req.admin._id;

//   const {
//     businessName,
//     name,
//     phone,
//     email,
//     correspondenceAddress,
//     deliveryAddress,
//     customerType,
//     creditLimit,
//     category,
//   } = req.body;

//   if (
//     !businessName ||
//     !phone ||
//     !customerType ||
//     !email ||
//     !deliveryAddress ||
//     !correspondenceAddress
//   ) {
//     throw new AppError("All fields are required", 400);
//   }

//   if (!["CC", "PC"].includes(customerType)) {
//     throw new AppError("Invalid customerType, should be CC or PC", 400);
//   }
//      if (customerType === "PC") {
//       creditLimit = 0; // Proforma cannot have credit
//     }

//   const existing = await Customer.findOne({
//     $or: [{ phone }, { email }],
//   });

//   if (existing) {
//     throw new AppError("Customer already exists", 400);
//   }

//   const customerCode = await generateCustomerCode();

//   const customer = await Customer.create({
//     businessName,
//     name,
//     customerCode,
//     phone,
//     email,
//     correspondenceAddress,
//     deliveryAddress,
//     customerType,
//     creditLimit,
//     category,
//     createdBy: adminId,
//   });

//   return res.ok(customer, "Customer created successfully");
// });

const createCustomer = catchAsync(async (req, res) => {
  const adminId = req.admin._id;

  let {
    businessName,
    name,
    phone,
    secondaryPhone,
    email,
    correspondenceAddress,
    deliveryAddress,
    customerType,
    creditLimit,
    category,
  } = req.body;

  const primaryPhone = phone;

  if (
    !businessName ||
    !primaryPhone ||
    !customerType ||
    !email ||
    !deliveryAddress ||
    !correspondenceAddress
  ) {
    throw new AppError("All fields are required", 400);
  }

  if (!["CC", "PC"].includes(customerType)) {
    throw new AppError("Invalid customerType, should be CC or PC", 400);
  }

  if (customerType === "PC") {
    creditLimit = 0;
  }

  if (customerType === "CC") {
    if (!creditLimit || creditLimit <= 0) {
      throw new AppError("Credit limit is required for CC customers", 400);
    }
  }

  const existing = await Customer.findOne({
    $or: [{ primaryPhone }, { email }],
  });

  if (existing) {
    throw new AppError("Customer already exists", 400);
  }

  const customerCode = await generateCustomerCode();

  const customer = await Customer.create({
    businessName,
    name,
    customerCode,
    primaryPhone,
    secondaryPhone,
    email,
    correspondenceAddress,
    deliveryAddress,
    customerType,
    creditLimit,
    category,
    createdBy: adminId,
  });

  return res.ok(customer, "Customer created successfully");
});

const checkCustomerAvailability = catchAsync(async (req, res) => {
  const email = req.query.email?.trim().toLowerCase();
  const primaryPhone = req.query.primaryPhone?.trim();

  if (!email && !primaryPhone) {
    throw new AppError("email or primaryPhone is required", 400);
  }

  const [emailExists, primaryPhoneExists] = await Promise.all([
    email ? Customer.exists({ email }) : Promise.resolve(null),
    primaryPhone
      ? Customer.exists({ primaryPhone })
      : Promise.resolve(null),
  ]);

  return res.ok(
    {
      emailExists: Boolean(emailExists),
      primaryPhoneExists: Boolean(primaryPhoneExists),
    },
    "Customer availability fetched successfully"
  );
});

const getCustomerById = catchAsync(async (req, res) => {
  const { customerId } = req.query;

  if (!customerId) {
    throw new AppError("Customer ID is required", 400);
  }
  if (!isValidObjectId(customerId)) {
    throw new AppError("Invalid Customer id", 400);
  }

  const customer = await Customer.findById(customerId);

  if (!customer || customer.isDeleted) {
    throw new AppError("Customer not found", 404);
  }

  return res.ok(customer, "Customer details fetched successfully");
});

// const updateCustomer = catchAsync(async (req, res) => {
//   let {
//     businessName,
//     name,
//     phone,
//     email,
//     correspondenceAddress,
//     deliveryAddress,
//     customerType,
//     creditLimit,
//     category,
//     customerId,
//   } = req.body;

//   if (!customerId) {
//     throw new AppError("Please provide customerId", 400);
//   }

//   const customer = await Customer.findById(customerId);

//   if (!customer || customer.isDeleted) {
//     throw new AppError("Customer not found", 404);
//   }

//   if (customerType) {
//     customer.customerType = customerType;
//   }

//   if (customerType === "PC") {
//     customer.creditLimit = 0;
//   } else if (creditLimit !== undefined) {
//     customer.creditLimit = creditLimit;
//   }

//   // Update only provided fields
//   if (businessName) customer.businessName = businessName;
//   if (name) customer.name = name;
//   if (phone) customer.phone = phone;
//   if (email) customer.email = email;
//   if (customerType) customer.customerType = customerType;
//   if (creditLimit !== undefined) customer.creditLimit = creditLimit;
//   if (category) customer.category = category;

//   if (correspondenceAddress) {
//     customer.correspondenceAddress = {
//       line1:
//         correspondenceAddress?.line1 ?? customer.correspondenceAddress.line1,
//       line2:
//         correspondenceAddress?.line2 ?? customer.correspondenceAddress.line2,
//       city: correspondenceAddress?.city ?? customer.correspondenceAddress.city,
//       state:
//         correspondenceAddress?.state ?? customer.correspondenceAddress.state,
//       postcode:
//         correspondenceAddress?.postcode ??
//         customer.correspondenceAddress.postcode,
//     };
//   }

//   if (deliveryAddress) {
//     customer.deliveryAddress = {
//       line1: deliveryAddress?.line1 ?? customer.deliveryAddress.line1,
//       line2: deliveryAddress?.line2 ?? customer.deliveryAddress.line2,
//       city: deliveryAddress?.city ?? customer.deliveryAddress.city,
//       state: deliveryAddress?.state ?? customer.deliveryAddress.state,
//       postcode: deliveryAddress?.postcode ?? customer.deliveryAddress.postcode,
//     };
//   }

//   await customer.save();

//   return res.ok(customer, "Customer updated successfully");
// });

const updateCustomer = catchAsync(async (req, res) => {
  const {
    businessName,
    name,
    primaryPhone,
    phone,
    secondaryPhone,
    email,
    customerCode,
    correspondenceAddress,
    deliveryAddress,
    customerType,
    creditLimit,
    category,
    customerId,
  } = req.body;

  if (!customerId) {
    throw new AppError("Please provide customerId", 400);
  }

  const customer = await Customer.findById(customerId);

  if (!customer || customer.isDeleted) {
    throw new AppError("Customer not found", 404);
  }

  const finalPhone = phone || primaryPhone;

  // Update simple fields
  if (businessName) customer.businessName = businessName;
  if (name) customer.name = name;
  if (customerCode) customer.customerCode = customerCode;
  if (finalPhone) customer.primaryPhone = finalPhone;
  if (secondaryPhone) customer.secondaryPhone = secondaryPhone;
  if (email) customer.email = email;
  if (category) customer.category = category;

  // Customer Type + Credit Logic (ONLY ONCE)
  if (customerType) {
    customer.customerType = customerType;
  }

  const finalCustomerType = customerType || customer.customerType;

  if (finalCustomerType === "PC") {
    customer.creditLimit = 0;
  } else if (creditLimit !== undefined) {
    customer.creditLimit = creditLimit;
  }

  // Addresses
  if (correspondenceAddress) {
    customer.correspondenceAddress = {
      line1:
        correspondenceAddress.line1 ?? customer.correspondenceAddress?.line1,
      line2:
        correspondenceAddress.line2 ?? customer.correspondenceAddress?.line2,
      city: correspondenceAddress.city ?? customer.correspondenceAddress?.city,
      state:
        correspondenceAddress.state ?? customer.correspondenceAddress?.state,
      postcode:
        correspondenceAddress.postcode ??
        customer.correspondenceAddress?.postcode,
    };
  }

  if (deliveryAddress) {
    customer.deliveryAddress = {
      line1: deliveryAddress.line1 ?? customer.deliveryAddress?.line1,
      line2: deliveryAddress.line2 ?? customer.deliveryAddress?.line2,
      city: deliveryAddress.city ?? customer.deliveryAddress?.city,
      state: deliveryAddress.state ?? customer.deliveryAddress?.state,
      postcode: deliveryAddress.postcode ?? customer.deliveryAddress?.postcode,
    };
  }

  await customer.save();

  return res.ok(customer, "Customer updated successfully");
});

// const getAllCustomers = catchAsync(async (req, res) => {
//   let {
//     query,
//     sort = "createdAt",
//     sortType = "desc",
//     limit = 10,
//     page = 1,
//     isArchived,
//   } = req.query;

//   // Convert boolean query
//   if (typeof isArchived === "string") {
//     isArchived = isArchived.toLowerCase() === "true";
//   } else {
//     isArchived = false; // default: show only active (unarchived)
//   }

//   // Convert limit & page
//   limit = parseInt(limit, 10) > 0 ? parseInt(limit, 10) : 10;
//   page = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;

//   let filters = { isArchived }; // << updated key

//   // Search
//   if (query) {
//     const regex = new RegExp(query, "i");
//     filters.$or = [
//       { name: regex },
//       { businessName: regex },
//       { phone: regex },
//       { email: regex },
//       { customerCode: regex },
//     ];
//   }

//   // Sorting
//   let sortOrder = sortType === "asc" ? 1 : -1;
//   let sortQuery = {};
//   sortQuery[sort] = sortOrder;

//   const skip = (page - 1) * limit;

//   // Fetch data
//   const [customers, total] = await Promise.all([
//     Customer.find(filters).sort(sortQuery).skip(skip).limit(limit),
//     Customer.countDocuments(filters),
//   ]);

//   const totalPages = Math.ceil(total / limit);

//   return res.ok(
//     {
//       customers,
//       pagination: {
//         total,
//         page,
//         totalPages,
//         limit,
//         isArchived,
//       },
//     },
//     "Customers fetched successfully"
//   );
// });

const getAllCustomers = catchAsync(async (req, res) => {
  let {
    query,
    sort = "createdAt",
    sortType = "desc",
    limit = 10,
    page = 1,
    isArchived,
  } = req.query;

  // Convert boolean query
  if (typeof isArchived === "string") {
    isArchived = isArchived.toLowerCase() === "true";
  } else if (typeof isArchived !== "boolean") {
    isArchived = false;
  }

  // Convert limit & page
  limit = parseInt(limit, 10) > 0 ? parseInt(limit, 10) : 10;
  page = parseInt(page, 10) > 0 ? parseInt(page, 10) : 1;

  let filters = { isArchived };

  // Search logic
  if (query) {
    const regex = new RegExp(query, "i");
    filters.$or = [
      { name: regex },
      { businessName: regex },
      { primaryPhone: regex },
      { secondaryPhone: regex },
      { email: regex },
      { customerCode: regex },
    ];
  }

  // Sorting
  let sortOrder = sortType === "asc" ? 1 : -1;
  let sortQuery = {};
  sortQuery[sort] = sortOrder;

  const skip = (page - 1) * limit;

  // 1. Fetch Customers & Total Count
  const [customers, total] = await Promise.all([
    Customer.find(filters).sort(sortQuery).skip(skip).limit(limit).lean(),
    Customer.countDocuments(filters),
  ]);

  // 2. Fetch Sales Orders AND Invoices for these customers
  const customersWithSalesOrders = await Promise.all(
    customers.map(async (customer) => {
      // A. Fetch Sales Orders for this customer
      const salesOrders = await salesOrder
        .find({
          customerId: customer._id,
        })
        .select("salesOrderNumber totalGross status paymentStatus orderDate")
        .lean(); // .lean() is crucial to attach new properties

      // B. Extract Order IDs to find related Invoices
      const orderIds = salesOrders.map((order) => order._id);

      // C. Fetch Invoices linked to these orders
      // We only need the 'invoiceDate' and 'order' (to match them up)
      const invoices = await Invoice.find({
        order: { $in: orderIds },
      })
        .select("invoiceDate order")
        .lean();

      // D. Merge invoiceDate into the salesOrder objects
      const ordersWithInvoiceDate = salesOrders.map((order) => {
        // Find the invoice that points to this order
        const matchedInvoice = invoices.find(
          (inv) => inv.order.toString() === order._id.toString()
        );

        return {
          ...order,
          invoiceDate: matchedInvoice ? matchedInvoice.invoiceDate : null, // Add date or null
        };
      });

      return {
        ...customer,
        salesOrders: ordersWithInvoiceDate,
      };
    })
  );

  const totalPages = Math.ceil(total / limit);

  return res.ok(
    {
      customers: customersWithSalesOrders,
      pagination: {
        total,
        page,
        totalPages,
        limit,
        isArchived,
      },
    },
    "Customers fetched successfully"
  );
});


const switchCustomerType = catchAsync(async (req, res) => {
  const { customerId } = req.body;

  if (!customerId) {
    throw new AppError("customerId is required", 400);
  }

  const customer = await Customer.findById(customerId);

  if (!customer || customer.isDeleted) {
    throw new AppError("Customer not found", 404);
  }

  // Toggle logic
  customer.customerType = customer.customerType === "CC" ? "PC" : "CC";

  await customer.save();

  return res.ok(
    customer,
    `Customer type switched to ${customer.customerType} successfully`
  );
});

const archiveUnarchiveCustomer = catchAsync(async (req, res) => {
  const adminId = req.admin?._id;
  // always check admin from token
  if (!adminId) {
    throw new AppError("Unauthorized access", 401);
  }

  const { customerId } = req.body;

  if (!customerId) {
    throw new AppError("customerId is required", 400);
  }

  const customer = await Customer.findById(customerId);

  if (!customer) {
    throw new AppError("Customer not found", 404);
  }

  customer.isArchived = !customer.isArchived;
  await customer.save();

  const statusMessage = customer.isArchived
    ? "Customer archived successfully"
    : "Customer restored to active file";

  return res.ok(customer, statusMessage);
});

const searchCustomer = catchAsync(async (req, res) => {
  const { query } = req.query;

  const searchValue = query?.trim();
  if (!searchValue) {
    throw new AppError("Search query is required", 400);
  }

  const regex = new RegExp(searchValue, "i");

  let searchCriteria = [
    { name: regex },
    { businessName: regex },
    { customerCode: regex },
    { email: regex },
    { primaryPhone: regex },
    { secondaryPhone: regex },
    { category: regex },
    { customerType: regex },

    // delivery address
    { "deliveryAddress.line1": regex },
    { "deliveryAddress.city": regex },
    { "deliveryAddress.state": regex },
    { "deliveryAddress.postcode": regex },

    // correspondence address
    { "correspondenceAddress.line1": regex },
    { "correspondenceAddress.city": regex },
    { "correspondenceAddress.state": regex },
    { "correspondenceAddress.postcode": regex },
  ];

  // Numeric search case
  if (!isNaN(searchValue)) {
    searchCriteria.push({ primaryPhone: searchValue });
    searchCriteria.push({ secondaryPhone: searchValue });
  }

  const customers = await Customer.find({
    isArchived: false,
    $or: searchCriteria,
  }).sort({ createdAt: -1 });

  if (!customers.length) {
    return res.ok([], "No customers matched your search");
  }

  return res.ok(customers, "Customers fetched successfully");
});
const setCustomerDueDateDay = catchAsync(async (req, res) => {
  const { customerId, dueDateDay } = req.body;
  if (!customerId) {
    throw new AppError("customerId is required", 400);
  }
  const customer = await Customer.findById(customerId);
  if (!customer) {
    throw new AppError("Customer not found", 404);
  }
  customer.dueDateDay = dueDateDay;
  await customer.save();
  return res.ok(customer, "Customer due date day updated successfully");
});

const bulkUploadCustomers = catchAsync(async (req, res) => {
  let adminId = req.admin ? req.admin._id : null;
  if (!adminId) {
    // Temporary fallback for testing if token is missing
    const firstAdmin = await adminModal.findOne();
    if (firstAdmin) {
      adminId = firstAdmin._id;
    } else {
      throw new AppError("Authentication required. No admin found in database to assign as creator.", 401);
    }
  }

  if (!req.file) {
    throw new AppError("Please upload an Excel file", 400);
  }

  const filePath = req.file.path;
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet);

  if (data.length === 0) {
    throw new AppError("The Excel file is empty", 400);
  }

  const results = {
    success: 0,
    errors: [],
  };

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNum = i + 2; // +1 for 0-index, +1 for header row

    try {
      const {
        businessName,
        name,
        primaryPhone,
        secondaryPhone,
        email,
        customerType,
        creditLimit,
        category,
        corr_line1,
        corr_line2,
        corr_city,
        corr_state,
        corr_postcode,
        del_line1,
        del_line2,
        del_city,
        del_state,
        del_postcode,
      } = row;

      // Basic validation
      if (!businessName || !primaryPhone || !customerType || !email) {
        results.errors.push({
          row: rowNum,
          error: "Missing required fields: Business Name, Primary Phone, Email, or Customer Type",
        });
        continue;
      }

      if (!["CC", "PC"].includes(customerType)) {
        results.errors.push({
          row: rowNum,
          error: "Invalid customerType, should be CC or PC",
        });
        continue;
      }

      // Check if exists
      const existing = await Customer.findOne({
        $or: [{ primaryPhone: String(primaryPhone) }, { email: String(email).toLowerCase() }],
      });

      if (existing) {
        results.errors.push({
          row: rowNum,
          error: `Customer with phone ${primaryPhone} or email ${email} already exists`,
        });
        continue;
      }

      const validCategories = ["trade", "retail", "vip", "cash"];
      const finalCategory = validCategories.includes(String(category).toLowerCase()) ? String(category).toLowerCase() : "trade";

      const customerCode = await generateCustomerCode();

      await Customer.create({
        businessName,
        name,
        customerCode,
        primaryPhone: String(primaryPhone),
        secondaryPhone: secondaryPhone ? String(secondaryPhone) : undefined,
        email: String(email).toLowerCase(),
        customerType,
        creditLimit: customerType === "CC" ? (Number(creditLimit) || 0) : 0,
        category: finalCategory,
        correspondenceAddress: {
          line1: corr_line1,
          line2: corr_line2,
          city: corr_city,
          state: corr_state,
          postcode: corr_postcode,
        },
        deliveryAddress: {
          line1: del_line1,
          line2: del_line2,
          city: del_city,
          state: del_state,
          postcode: del_postcode,
        },
        createdBy: adminId,
      });

      results.success++;
    } catch (err) {
      results.errors.push({
        row: rowNum,
        error: err.message,
      });
    }
  }

  // Delete temp file
  try {
    fs.unlinkSync(filePath);
  } catch (err) {
    console.error("Error deleting temp file:", err);
  }

  return res.ok(results, `Bulk upload completed. ${results.success} customers created, ${results.errors.length} errors.`);
});

module.exports = {
  createCustomer,
  checkCustomerAvailability,
  getCustomerById,
  getAllCustomers,
  updateCustomer,
  switchCustomerType,
  archiveUnarchiveCustomer,
  searchCustomer,
  setCustomerDueDateDay,
  bulkUploadCustomers,
};
