const mongoose = require("mongoose");
const env = require("./src/config/envConfig");
const Stock = require("./src/models/stock.model");
const Product = require("./src/models/product.model");

(async () => {
  try {
    await mongoose.connect(env.MONGO_URI);
    console.log("Connected to MongoDB:", env.MONGO_URI);
    
    const stockId = "69396911a582952c48b3edfb";
    const record = await Stock.findById(stockId).populate("productId");
    if (record) {
      console.log("Found Stock Record:");
      console.log(JSON.stringify(record, null, 2));
    } else {
      console.log(`Stock Record ${stockId} not found.`);
      // Let's print the latest stock records to see what we have
      const latest = await Stock.find({}).limit(5).populate("productId");
      console.log("Latest stock records:");
      console.log(JSON.stringify(latest, null, 2));
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
