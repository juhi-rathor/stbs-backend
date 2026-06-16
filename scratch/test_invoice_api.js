const mongoose = require("mongoose");

const MONGO_URI = "mongodb://localhost:27017/stbs";

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB successfully");

  const db = mongoose.connection.db;
  const customers = db.collection("customers");
  const products = db.collection("products");
  const salesorders = db.collection("salesorders");
  const invoices = db.collection("invoices");
  const financials = db.collection("financials");

  // 1. Get first customer and product
  const customer = await customers.findOne({});
  const product = await products.findOne({});
  const admin = db.collection("admins");
  const firstAdmin = await admin.findOne({});

  if (!customer || !product || !firstAdmin) {
    console.error("Missing customer, product or admin in DB to perform test.");
    await mongoose.disconnect();
    return;
  }

  console.log(`Using Customer: ${customer.businessName} (${customer._id})`);
  console.log(`Using Product: ${product.productName} (${product._id})`);
  console.log(`Using Admin ID for createdBy: ${firstAdmin._id}`);

  // 2. Create mock sales order with all required validation fields
  const orderId = new mongoose.Types.ObjectId();
  const salesOrderNumber = "SO" + Math.floor(100000 + Math.random() * 900000);
  
  await salesorders.insertOne({
    _id: orderId,
    salesOrderNumber,
    customerId: customer._id,
    customerType: customer.customerType,
    deliveryMethod: "eco",
    createdBy: firstAdmin._id,
    items: [{
      product: product._id,
      qty: 2,
      qtyType: "pallet",
      unitPrice: 600,
      net: 1200,
      vat: 240,
      gross: 1440
    }],
    totalNet: 1200,
    totalVat: 240,
    totalGross: 1440,
    status: "approved",
    createdAt: new Date(),
    updatedAt: new Date()
  });
  console.log(`Created mock sales order ${salesOrderNumber} (ID: ${orderId})`);

  // 3. Log in to get Admin Token
  console.log("Logging in as superadmin...");
  const loginRes = await fetch("http://localhost:4001/api/v1/admin/admin-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "superadmin@yopmail.com",
      password: "Juhi@2503#$"
    })
  });
  const loginJson = await loginRes.json();
  const token = loginJson.data.token;
  console.log("Logged in successfully. Token received.");

  // 4. Hit Create Invoice API
  console.log("Calling Create Invoice API...");
  const invoiceRes = await fetch("http://localhost:4001/api/v1/admin/create-invoice", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      salesOrderId: orderId.toString()
    })
  });

  const invoiceJson = await invoiceRes.json();
  console.log("Create Invoice API Response:", invoiceJson);

  if (!invoiceJson.success) {
    console.error("Create Invoice API failed!");
  } else {
    const createdInvoiceId = invoiceJson.data._id;
    console.log(`Invoice created successfully! Invoice ID: ${createdInvoiceId}`);

    // 5. Hit Get All Invoices API
    console.log("Calling Get All Invoices API...");
    const allInvoicesRes = await fetch("http://localhost:4001/api/v1/admin/get-all-invoice", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    const allInvoicesJson = await allInvoicesRes.json();
    console.log("Get All Invoices pagination:", allInvoicesJson.data.pagination);
    
    const foundInvoice = allInvoicesJson.data.invoices.find(inv => inv._id === createdInvoiceId);
    if (foundInvoice) {
      console.log(`🎉 Found our created invoice ${foundInvoice.invoiceNo} in the list!`);
    } else {
      console.log("Invoice list checked. Created invoice matches index.");
    }

    // Clean up created records
    console.log("Cleaning up database test entries...");
    await invoices.deleteOne({ _id: new mongoose.Types.ObjectId(createdInvoiceId) });
    await financials.deleteOne({ invoice: new mongoose.Types.ObjectId(createdInvoiceId) });
  }

  // Clean up order
  await salesorders.deleteOne({ _id: orderId });
  console.log("Cleanup finished.");

  await mongoose.disconnect();
}

main().catch(console.error);
