// backend/src/controllers/comments.controller.js
const Comment = require('../models/Comment');
const Response = require('../models/Response');
const Form = require('../models/Form');
const User = require('../models/User');
const mongoose = require('mongoose');

// Add comment to a response
exports.addComment = async (req, res, next) => {
  try {
    const { formId, responseId } = req.params;
    const { text, mentions = [], parentCommentId } = req.body;
    const userId = req.user._id;

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(formId) || !mongoose.Types.ObjectId.isValid(responseId)) {
      return res.status(400).json({ message: 'Invalid form or response ID' });
    }

    // Check if user has access to this form/response
    const response = await Response.findById(responseId);
    if (!response || response.form.toString() !== formId) {
      return res.status(404).json({ message: 'Response not found' });
    }

    // Create comment
    const comment = new Comment({
      response: responseId,
      form: formId,
      author: userId,
      text,
      mentions,
      parentComment: parentCommentId || null,
    });

    await comment.save();

    // If replying to a comment, add to parent's replies
    if (parentCommentId) {
      await Comment.findByIdAndUpdate(parentCommentId, {
        $push: { replies: comment._id },
      });
    }

    // Populate author details
    await comment.populate('author', 'name email avatar');

    res.status(201).json({
      message: 'Comment added',
      comment: {
        id: comment._id,
        text: comment.text,
        author: comment.author,
        mentions: comment.mentions,
        createdAt: comment.createdAt,
        isResolved: comment.isResolved,
      },
    });
  } catch (err) {
    next(err);
  }
};

// Get all comments for a response
exports.getResponseComments = async (req, res, next) => {
  try {
    const { responseId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(responseId)) {
      return res.status(400).json({ message: 'Invalid response ID' });
    }

    const comments = await Comment.find({
      response: responseId,
      parentComment: null, // Only top-level comments
    })
      .populate('author', 'name email avatar')
      .populate({
        path: 'replies',
        populate: {
          path: 'author',
          select: 'name email avatar',
        },
      })
      .sort({ createdAt: -1 });

    res.json({
      responseId,
      comments: comments.map(c => ({
        id: c._id,
        text: c.text,
        author: c.author,
        mentions: c.mentions,
        likes: c.likes.length,
        isLiked: c.likes.includes(req.user._id),
        isResolved: c.isResolved,
        edited: c.edited,
        createdAt: c.createdAt,
        replies: c.replies.map(r => ({
          id: r._id,
          text: r.text,
          author: r.author,
          likes: r.likes.length,
          isLiked: r.likes.includes(req.user._id),
          createdAt: r.createdAt,
        })),
      })),
    });
  } catch (err) {
    next(err);
  }
};

// Update comment
exports.updateComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const { text } = req.body;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ message: 'Invalid comment ID' });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Only author can edit
    if (comment.author.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'You can only edit your own comments' });
    }

    comment.text = text;
    comment.edited = true;
    comment.editedAt = new Date();
    await comment.save();

    await comment.populate('author', 'name email avatar');

    res.json({
      message: 'Comment updated',
      comment: {
        id: comment._id,
        text: comment.text,
        author: comment.author,
        edited: comment.edited,
      },
    });
  } catch (err) {
    next(err);
  }
};

// Delete comment
exports.deleteComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const userId = req.user._id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Only author or form owner can delete
    const form = await Form.findById(comment.form);
    if (comment.author.toString() !== userId.toString() && form.user.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'You cannot delete this comment' });
    }

    // Delete comment and remove from parent's replies
    if (comment.parentComment) {
      await Comment.findByIdAndUpdate(comment.parentComment, {
        $pull: { replies: commentId },
      });
    }

    await Comment.findByIdAndDelete(commentId);

    res.json({ message: 'Comment deleted' });
  } catch (err) {
    next(err);
  }
};

// Like/unlike comment
exports.toggleLike = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const userId = req.user._id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const likeIndex = comment.likes.indexOf(userId);
    if (likeIndex === -1) {
      comment.likes.push(userId);
    } else {
      comment.likes.splice(likeIndex, 1);
    }

    await comment.save();

    res.json({
      message: likeIndex === -1 ? 'Comment liked' : 'Like removed',
      likes: comment.likes.length,
    });
  } catch (err) {
    next(err);
  }
};

// Resolve/unresolve comment
exports.toggleResolve = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const userId = req.user._id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check permission (author or form owner)
    const form = await Form.findById(comment.form);
    if (comment.author.toString() !== userId.toString() && form.user.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'You cannot resolve this comment' });
    }

    comment.isResolved = !comment.isResolved;
    await comment.save();

    res.json({
      message: comment.isResolved ? 'Comment resolved' : 'Comment unresolved',
      isResolved: comment.isResolved,
    });
  } catch (err) {
    next(err);
  }
};
