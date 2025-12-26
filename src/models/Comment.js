// backend/src/models/Comment.js
const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    response: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Response',
      required: true,
      index: true,
    },
    form: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Form',
      required: true,
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    mentions: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        username: String,
      },
    ],
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null, // null means top-level comment, otherwise it's a reply
    },
    replies: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
      },
    ],
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    edited: { type: Boolean, default: false },
    editedAt: Date,
    isResolved: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Indexes for efficient queries
commentSchema.index({ response: 1, createdAt: -1 });
commentSchema.index({ form: 1, createdAt: -1 });
commentSchema.index({ author: 1 });

module.exports = mongoose.model('Comment', commentSchema);
