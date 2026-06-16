const mongoose = require("mongoose");

const emailTemplateSchema = new mongoose.Schema(
  {
    // Unique machine-readable key — used as identifier by backend & frontend
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    // Human-readable label shown in the frontend dropdown
    label: {
      type: String,
      required: true,
      trim: true,
    },

    // Short description of when this email is sent
    description: {
      type: String,
      trim: true,
      default: "",
    },

    // The full editable HTML content of the template
    htmlContent: {
      type: String,
      required: true,
    },

    // List of dynamic variables used in this template (for the reference panel)
    variables: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

module.exports = mongoose.model("EmailTemplate", emailTemplateSchema);
