const nodemailer = require("nodemailer");
const EmailLog = require("../models/emailLog.model");

// Create transporter
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USERNAME,
    pass: process.env.SMTP_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

/**
 * Generic function to send email with logging
 * @param {Object} emailData - Email data containing all necessary information
 * @param {string} emailData.to - Recipient email address
 * @param {string} emailData.subject - Email subject
 * @param {string} emailData.html - HTML content of the email
 * @param {string} emailData.text - Plain text content of the email (optional)
 * @param {Array} emailData.attachments - Email attachments (optional)
 * @param {string} emailType - Type of email for logging purposes
 * @param {Object} referenceInfo - Reference information for logging
 */
const sendEmailWithLogging = async (emailData, emailType, referenceInfo = {}) => {
  // Create email log entry
  const emailLog = await EmailLog.create({
    emailType,
    referenceType: referenceInfo.type || null,
    referenceId: referenceInfo.id || null,
    recipientEmail: emailData.to,
    recipientName: referenceInfo.recipientName || '',
    subject: emailData.subject,
    body: emailData.html || emailData.text || '',
    status: 'pending',
    metadata: {
      ...referenceInfo.metadata
    }
  });

  try {
    // Prepare mail options
    const mailOptions = {
      from: process.env.SMTP_USERNAME,
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
      attachments: emailData.attachments
    };

    // Send email
    const result = await transporter.sendMail(mailOptions);

    // Update email log status to sent
    emailLog.status = 'sent';
    emailLog.sentAt = new Date();
    await emailLog.save();

    return result;
  } catch (error) {
    // Update email log status to failed
    emailLog.status = 'failed';
    emailLog.error = error.message;
    await emailLog.save();

    throw error;
  }
};

module.exports = {
  sendEmailWithLogging,
  transporter
};