// backend/src/models/FormShare.js
const mongoose = require('mongoose');

const formShareSchema = new mongoose.Schema(
  {
    form: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Form',
      required: true,
      index: true,
    },
    sharedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sharedWith: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['owner', 'editor', 'viewer', 'response_manager'],
      default: 'viewer',
      required: true,
    },
    permissions: {
      canEdit: { type: Boolean, default: false }, // edit form fields/settings
      canViewResponses: { type: Boolean, default: false }, // view responses
      canDeleteResponses: { type: Boolean, default: false }, // delete responses
      canAddComments: { type: Boolean, default: false }, // comment on responses
      canShare: { type: Boolean, default: false }, // share with others
      canDelete: { type: Boolean, default: false }, // delete form
    },
    sharedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: Date, // optional: share link expiration
    message: String, // custom message when sharing
  },
  { timestamps: true }
);

// Compound index for unique sharing relationship
formShareSchema.index({ form: 1, sharedWith: 1 }, { unique: true });

// Set permissions based on role
formShareSchema.pre('save', function(next) {
  switch (this.role) {
    case 'owner':
      this.permissions = {
        canEdit: true,
        canViewResponses: true,
        canDeleteResponses: true,
        canAddComments: true,
        canShare: true,
        canDelete: true,
      };
      break;
    case 'editor':
      this.permissions = {
        canEdit: true,
        canViewResponses: true,
        canDeleteResponses: false,
        canAddComments: true,
        canShare: false,
        canDelete: false,
      };
      break;
    case 'response_manager':
      this.permissions = {
        canEdit: false,
        canViewResponses: true,
        canDeleteResponses: true,
        canAddComments: true,
        canShare: false,
        canDelete: false,
      };
      break;
    case 'viewer':
    default:
      this.permissions = {
        canEdit: false,
        canViewResponses: true,
        canDeleteResponses: false,
        canAddComments: false,
        canShare: false,
        canDelete: false,
      };
      break;
  }
  next();
});

module.exports = mongoose.model('FormShare', formShareSchema);
