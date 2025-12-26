// server/src/models/View.js
const mongoose = require('mongoose');

const viewSchema = new mongoose.Schema(
  {
    form: {
      type: String,
      ref: 'Form',
      required: true,
      index: true,
    },
    meta: {
      ip: String,
      userAgent: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('View', viewSchema);