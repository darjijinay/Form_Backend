// backend/src/controllers/sharing.controller.js
const FormShare = require('../models/FormShare');
const Form = require('../models/Form');
const User = require('../models/User');
const mongoose = require('mongoose');

// Share a form with another user
exports.shareForm = async (req, res, next) => {
  try {
    const { formId } = req.params;
    const { email, role = 'viewer', message } = req.body;
    const userId = req.user._id;

    // Validate form ID
    if (!mongoose.Types.ObjectId.isValid(formId)) {
      return res.status(400).json({ message: 'Invalid form ID' });
    }

    // Check if user owns the form
    const form = await Form.findById(formId);
    if (!form || form.user.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'You do not own this form' });
    }

    // Find user by email
    const shareWithUser = await User.findOne({ email });
    if (!shareWithUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent sharing with self
    if (shareWithUser._id.toString() === userId.toString()) {
      return res.status(400).json({ message: 'Cannot share form with yourself' });
    }

    // Create or update share record
    let share = await FormShare.findOne({
      form: formId,
      sharedWith: shareWithUser._id,
    });

    if (share) {
      share.role = role;
      share.message = message;
    } else {
      share = new FormShare({
        form: formId,
        sharedBy: userId,
        sharedWith: shareWithUser._id,
        role,
        message,
      });
    }

    await share.save();

    res.status(201).json({
      message: `Form shared with ${shareWithUser.name}`,
      share: {
        id: share._id,
        user: shareWithUser.name,
        email: shareWithUser.email,
        role: share.role,
        permissions: share.permissions,
      },
    });
  } catch (err) {
    next(err);
  }
};

// Get all shares for a form (owner only)
exports.getFormShares = async (req, res, next) => {
  try {
    const { formId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(formId)) {
      return res.status(400).json({ message: 'Invalid form ID' });
    }

    // Check ownership
    const form = await Form.findById(formId);
    if (!form || form.user.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'You do not own this form' });
    }

    const shares = await FormShare.find({ form: formId })
      .populate('sharedWith', 'name email avatar')
      .select('-sharedBy');

    res.json({
      formId,
      shares: shares.map(s => ({
        id: s._id,
        user: s.sharedWith.name,
        email: s.sharedWith.email,
        avatar: s.sharedWith.avatar,
        role: s.role,
        permissions: s.permissions,
        sharedAt: s.sharedAt,
      })),
    });
  } catch (err) {
    next(err);
  }
};

// Update share permissions
exports.updateShare = async (req, res, next) => {
  try {
    const { formId, shareId } = req.params;
    const { role } = req.body;
    const userId = req.user._id;

    // Verify ownership
    const form = await Form.findById(formId);
    if (!form || form.user.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'You do not own this form' });
    }

    const share = await FormShare.findById(shareId);
    if (!share || share.form.toString() !== formId) {
      return res.status(404).json({ message: 'Share record not found' });
    }

    share.role = role;
    await share.save();

    res.json({
      message: 'Share updated',
      share: {
        id: share._id,
        role: share.role,
        permissions: share.permissions,
      },
    });
  } catch (err) {
    next(err);
  }
};

// Remove share
exports.removeShare = async (req, res, next) => {
  try {
    const { formId, shareId } = req.params;
    const userId = req.user._id;

    // Verify ownership
    const form = await Form.findById(formId);
    if (!form || form.user.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'You do not own this form' });
    }

    const share = await FormShare.findByIdAndDelete(shareId);
    if (!share) {
      return res.status(404).json({ message: 'Share record not found' });
    }

    res.json({ message: 'Share removed' });
  } catch (err) {
    next(err);
  }
};

// Get forms shared with current user
exports.getSharedWithMe = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const shares = await FormShare.find({ sharedWith: userId })
      .populate('form', 'title description')
      .populate('sharedBy', 'name email');

    const forms = shares.map(s => ({
      form: {
        id: s.form._id,
        title: s.form.title,
        description: s.form.description,
      },
      sharedBy: s.sharedBy.name,
      role: s.role,
      permissions: s.permissions,
      sharedAt: s.sharedAt,
    }));

    res.json({ forms });
  } catch (err) {
    next(err);
  }
};
