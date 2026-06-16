const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb://localhost:27017/stbs');
  console.log('Connected to MongoDB');

  const res = await mongoose.connection.db.collection('financials').deleteMany({});
  console.log('Delete all result:', res);
  
  await mongoose.disconnect();
}

run().catch(console.error);
