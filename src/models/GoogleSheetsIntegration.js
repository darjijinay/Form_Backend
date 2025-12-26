// backend/src/models/GoogleSheetsIntegration.js
const mongoose = require('mongoose');

const googleSheetsSchema = new mongoose.Schema(
  {
    form: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Form',
      required: true,
      unique: true,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    spreadsheetId: {
      type: String,
      required: true,
      trim: true,
    },
    sheetName: {
      type: String,
      default: 'Responses',
      trim: true,
    },
    refreshToken: {
      type: String,
      required: true,
      // Encrypted field (consider encrypting in production)
    },
    accessToken: {
      type: String,
      required: true,
    },
    tokenExpiry: {
      type: Date,
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    syncOnSubmit: {
      type: Boolean,
      default: true,
    },
    headerRowCreated: {
      type: Boolean,
      default: false,
    },
    lastSyncedResponseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Response',
      default: null,
    },
    lastSyncTime: {
      type: Date,
      default: null,
    },
    syncCount: {
      type: Number,
      default: 0,
    },
    errors: {
      type: [
        {
          timestamp: Date,
          message: String,
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
    suppressReservedKeysWarning: true,
  }
);

// Compound index for efficient queries
googleSheetsSchema.index({ form: 1, owner: 1 });
googleSheetsSchema.index({ owner: 1, active: 1 });

module.exports = mongoose.model('GoogleSheetsIntegration', googleSheetsSchema);
