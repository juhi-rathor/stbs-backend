const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb://localhost:27017/stbs');
  console.log('Connected to MongoDB');

  const ids = [
    new mongoose.Types.ObjectId('6a29030862b4b34fd209a358'),
    new mongoose.Types.ObjectId('6a2901d062b4b34fd209a2ef')
  ];

  const res = await mongoose.connection.db.collection('financials').deleteMany({
    _id: { $in: ids }
  });

  console.log('Delete result:', res);
  await mongoose.disconnect();
}

run().catch(console.error);
