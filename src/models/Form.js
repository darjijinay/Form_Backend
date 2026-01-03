// server/src/models/Form.js
const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

const fieldSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // uuid or nanoid
    type: {
      type: String,
      enum: [
        'short_text',
        'long_text',
        'email',
        'number',
        'date',
        'dropdown',
        'checkbox',
        'radio',
        'file',
        'rating',
        'matrix',
        'signature',
        'image_choice',
      ],
      required: true,
    },
    label: { type: String, required: true },
    placeholder: { type: String },
    required: { type: Boolean, default: false },
    // For dropdown/radio/checkbox this will be strings, for image_choice we store objects {id,label,url}
    options: [{ type: mongoose.Schema.Types.Mixed }],
    validation: {
      required: { type: Boolean, default: false },
      minLength: Number,
      maxLength: Number,
      min: Number,
      max: Number,
      pattern: String, // regex pattern
      patternErrorMessage: String,
      email: Boolean, // validate as email
      phone: Boolean, // validate as phone
      customMessage: String, // custom error message for required
    },
    width: {
      type: String,
      enum: ['full', 'half'],
      default: 'full',
    },
    order: { type: Number, default: 0 },
    logic: {
      // conditional show/hide
      showWhenFieldId: String,
      operator: {
        type: String,
        enum: ['equals', 'not_equals', 'contains'],
      },
      value: String,
    },
    matrixRows: [{ type: String }], // for matrix/grid type
    matrixColumns: [{ type: String }], // for matrix/grid type
  },
  { _id: false }
);

const customDetailSchema = new mongoose.Schema(
  {
    label: { type: String, required: false, trim: true },
    type: { type: String, default: 'short_text' },
    value: { type: String, default: '' },
  },
  { _id: false, id: false }
);

const formSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: () => nanoid(12), // 12-char random string
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: String,
    subtitle: String,
    date: String,
    time: String,
    location: String,
    organizerName: String,
    organizerEmail: String,
    organizerPhone: String,
    logo: String, // logo image URL or data URL
    headerImage: String,
    customDetails: {
      type: [customDetailSchema],
      default: [],
    },
    fields: {
      type: [fieldSchema],
      default: [],
    },
    settings: {
      isPublic: { type: Boolean, default: true },
      notificationEmail: String,
      notifyOnSubmission: { type: Boolean, default: false },
      theme: {
        primaryColor: { type: String, default: '#6366f1' },
        accentColor: { type: String, default: '#22c55e' },
        background: { type: String, default: '#0f172a' },
      },
      allowMultipleSubmissions: { type: Boolean, default: true },
    },
    sourceTemplate: {
      type: String,
    },
    step1Labels: {
      type: Map,
      of: String,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Form', formSchema);
