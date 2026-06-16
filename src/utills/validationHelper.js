const mongoose = require("mongoose");

const isValidObjectId = (id) => {
  if (typeof id !== "string") return false;
  return mongoose.Types.ObjectId.isValid(id);
};

const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

module.exports = { isValidObjectId, validateEmail };
