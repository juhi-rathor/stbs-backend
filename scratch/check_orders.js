const mongoose = require("mongoose");

const MONGO_URI = "mongodb://localhost:27017/stbs";

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB successfully");

  const db = mongoose.connection.db;
  const col = db.collection("salesorders");

  const orders = await col.find({}).toArray();
  console.log("Found orders count:", orders.length);
  for (const order of orders.slice(0, 5)) {
    console.log({
      _id: order._id,
      salesOrderNumber: order.salesOrderNumber,
      status: order.status,
      customer: order.customerId
    });
  }

  await mongoose.disconnect();
}

main().catch(console.error);
