const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Utility to create multer configuration
const createMulter = (options = {}) => {
  const {
    folder = "uploads", // default folder
    fileSize = 10000000, // default file size 10MB
    fileTypes = /jpeg|jpg|png|pdf|doc|docx|txt|xls|xlsx|csv|json|zip|rar/, // allowed file types
  } = options;

  // Ensure folder exists
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }

  // Set storage engine
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
      }
      cb(null, folder);
    },
    filename: (req, file, cb) => {
      const ext = mimeToExt[file.mimetype] || file.mimetype.split("/")[1] || "bin";
      const fileName = `${Date.now()}.${ext}`;
      cb(null, fileName);
    },
  });

  const mimeToExt = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "docx",
    "text/plain": "txt",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "text/csv": "csv",
    "application/json": "json",
    "application/zip": "zip",
    "application/x-rar-compressed": "rar",
  };

  const checkFileType = (file, cb) => {
    const mimetype = fileTypes.test(file.mimetype);
    if (mimetype) {
      const extname = mimeToExt[file.mimetype];
      if (extname) {
        file.originalname = `${file.originalname}.${extname}`;
        return cb(null, true);
      } else {
        return cb(new Error("File extension could not be determined."));
      }
    } else {
      const allowedExtensions = fileTypes
        .toString()
        .toUpperCase()
        .replace(/^\//, "")
        .replace(/\/$/, "")
        .replace(/\|/g, ", ");
      return cb(new Error(`Only ${allowedExtensions} files are allowed.`));
    }
  };

  return multer({
    storage,
    limits: { fileSize },
    fileFilter: (req, file, cb) => checkFileType(file, cb),
  });
};

// Middleware for single file upload
const uploadSingleFile = (fieldName, options) => {
  const upload = createMulter(options).single(fieldName);
  return (req, res, next) => {
    upload(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.ok(
              null,
              `File too large. Max size is ${options.fileSize / 1000000}MB`,
              false
            );
          }
          return res.ok(null, err.message, false);
        } else {
          return res.ok(null, err.message, false);
        }
      }
      next();
    });
  };
};

// Middleware for multiple file upload
const uploadMultipleFiles = (fieldName, maxCount, options) => {
  const upload = createMulter(options).array(fieldName, maxCount);
  return (req, res, next) => {
    upload(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.ok(
              null,
              `File too large. Max size is ${options.fileSize / 1000000}MB`,
              false
            );
          }
          if (err.code === "LIMIT_UNEXPECTED_FILE") {
            return res.ok(
              null,
              `Too many files. Maximum allowed is ${maxCount}.`,
              false
            );
          }
          return res.ok(null, err.message, false);
        } else {
          return res.ok(null, err.message, false);
        }
      }
      next();
    });
  };
};

module.exports.uploadProductImage = uploadMultipleFiles("files", 5, {
  fileTypes: /jpeg|jpg|png|pdf/,
  fileSize: 10000000,
  folder: "uploads/ProductImage",
});

module.exports.uploadCustomerExcel = uploadSingleFile("file", {
  fileTypes: /vnd\.ms-excel|vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|csv|text\/csv/,
  fileSize: 10000000,
  folder: "uploads/CustomerExcel",
});

// Export for general use
module.exports.uploadSingleFile = uploadSingleFile;
module.exports.uploadMultipleFiles = uploadMultipleFiles;
