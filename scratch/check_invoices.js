const mongoose = require("mongoose");

const MONGO_URI = "mongodb://localhost:27017/stbs";

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB successfully");

  const db = mongoose.connection.db;
  const col = db.collection("invoices");

  const invoices = await col.find({}).toArray();
  console.log("Found invoices count:", invoices.length);
  for (const inv of invoices) {
    console.log({
      _id: inv._id,
      invoiceNo: inv.invoiceNo,
      order: inv.order,
      customer: inv.customer,
      gross: inv.gross
    });
  }

  await mongoose.disconnect();
}

main().catch(console.error);
