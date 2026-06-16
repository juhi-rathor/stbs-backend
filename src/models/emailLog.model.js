const mongoose = require("mongoose");

const emailLogSchema = new mongoose.Schema({
  // Type of email being logged
  emailType: {
    type: String,
    enum: ['invoice_created', 'payment_receipt', 'monthly_statement', 'payment_reminder_1', 'payment_reminder_2', 'payment_reminder_3', 'dispatch_notification', 'dispatch_confirmed', 'dispatch_delivered', 'dispatch_cancelled'],
    required: true,
    index: true
  },

  // Reference to the related entity (Invoice, Dispatch, etc.)
  referenceType: {
    type: String,
    enum: ['Invoice', 'Dispatch', 'Customer', 'Order'],
    required: true,
    index: true
  },

  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'referenceType',
    required: true,
    index: true
  },

  // Recipient details
  recipientEmail: {
    type: String,
    required: true,
    trim: true
  },

  recipientName: {
    type: String,
    trim: true
  },

  // Email content details
  subject: {
    type: String,
    required: true,
    trim: true
  },

  body: {
    type: String,
    required: true
  },



  // Status of email sending
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'resent'],
    default: 'pending',
    index: true
  },

  // Timestamps
  sentAt: {
    type: Date,
    default: null
  },

  // Error details if email failed
  error: {
    type: String,
    default: null
  },

  // Additional metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for efficient querying
emailLogSchema.index({ emailType: 1, createdAt: -1 });
emailLogSchema.index({ referenceType: 1, referenceId: 1 });
emailLogSchema.index({ recipientEmail: 1 });

module.exports = mongoose.model("EmailLog", emailLogSchema);