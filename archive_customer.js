const mongoose = require("mongoose");
const env = require("./src/config/envConfig");
const Customer = require("./src/models/Customer.model");

(async () => {
  try {
    await mongoose.connect(env.MONGO_URI);
    
    // Archive one of the Royal Cement Pvt Ltd customers
    const res = await Customer.updateOne(
      { customerCode: "STBS1002" },
      { $set: { isArchived: true } }
    );
    console.log("Customer archive status updated:", res);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
