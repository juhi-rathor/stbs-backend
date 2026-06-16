const mongoose = require("mongoose");

const MONGO_URI = "mongodb://localhost:27017/stbs";

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB successfully");

  const db = mongoose.connection.db;
  const products = db.collection("products");

  const list = await products.find({}).toArray();
  console.log("All Products in DB:");
  list.forEach(p => {
    console.log(`- ID: ${p._id} | Name: ${p.productName} | SKU: ${p.productCode} | qtyPerPallet: ${p.qtyPerPallet} | PricePerPallet: ${p.PricePerPallet} | PricePerBoard: ${p.PricePerBoard}`);
  });

  await mongoose.disconnect();
}

main().catch(console.error);
