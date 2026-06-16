const EmailTemplate = require("../../models/emailTemplate.model");
const { seedEmailTemplates } = require("../../seeds/emailTemplateSeed");

/**
 * GET /get-all-email-templates
 * Returns all email templates from DB (sorted by label)
 */
const getAllEmailTemplates = async (req, res) => {
  try {
    const templates = await EmailTemplate.find({}).sort({ label: 1 }).lean();

    if (!templates || templates.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No templates found. Please seed templates first.",
        data: [],
      });
    }

    return res.status(200).json({
      success: true,
      message: "Email templates fetched successfully.",
      data: templates,
    });
  } catch (err) {
    console.error("getAllEmailTemplates error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: err.message,
    });
  }
};

/**
 * PUT /update-email-template
 * Body: { key: string, htmlContent: string }
 * Updates the htmlContent of a single template by key
 */
const updateEmailTemplate = async (req, res) => {
  try {
    const { key, htmlContent } = req.body;

    if (!key || !htmlContent) {
      return res.status(400).json({
        success: false,
        message: "Both 'key' and 'htmlContent' are required.",
      });
    }

    const updated = await EmailTemplate.findOneAndUpdate(
      { key },
      { $set: { htmlContent } },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: `No template found with key: "${key}"`,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Template updated successfully.",
      data: updated,
    });
  } catch (err) {
    console.error("updateEmailTemplate error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
      error: err.message,
    });
  }
};

/**
 * POST /seed-email-templates
 * One-time seed — upserts all 11 default templates into DB.
 * Safe to run multiple times (existing customizations are NOT overwritten
 * unless you change the seed data).
 */
const seedTemplates = async (req, res) => {
  try {
    const { key } = req.body;
    const result = await seedEmailTemplates(key);
    return res.status(200).json({
      success: true,
      message: key ? `Template '${key}' seeded successfully.` : "All email templates seeded successfully.",
      data: result,
    });
  } catch (err) {
    console.error("seedTemplates error:", err);
    return res.status(500).json({
      success: false,
      message: "Seeding failed.",
      error: err.message,
    });
  }
};

module.exports = {
  getAllEmailTemplates,
  updateEmailTemplate,
  seedTemplates,
};
