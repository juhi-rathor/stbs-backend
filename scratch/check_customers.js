const mongoose = require("mongoose");

const MONGO_URI = "mongodb://localhost:27017/stbs";

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB successfully");

  const db = mongoose.connection.db;
  const customers = db.collection("customers");

  const list = await customers.find({}).toArray();
  console.log("All Customers in DB:");
  list.forEach(c => {
    console.log(`- ID: ${c._id} | Name: ${c.businessName || c.name} | Code: ${c.customerCode} | Type: ${c.customerType}`);
  });

  await mongoose.disconnect();
}

main().catch(console.error);
