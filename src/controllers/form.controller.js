// server/src/controllers/form.controller.js
const Form = require('../models/Form');

exports.createForm = async (req, res, next) => {
  try {
    const form = await Form.create({
      user: req.user._id,
      title: req.body.title || 'Untitled Form',
      description: req.body.description || '',
      subtitle: req.body.subtitle || '',
      date: req.body.date || '',
      time: req.body.time || '',
      location: req.body.location || '',
      organizerName: req.body.organizerName || '',
      organizerEmail: req.body.organizerEmail || '',
      organizerPhone: req.body.organizerPhone || '',
      logo: req.body.logo || '',
      headerImage: req.body.headerImage || '',
      customDetails: req.body.customDetails || [],
      fields: req.body.fields || [],
      settings: req.body.settings || {},
      sourceTemplate: req.body.sourceTemplate || '',
      step1Labels: req.body.step1Labels || {},
    });

    res.status(201).json(form);
  } catch (err) {
    next(err);
  }
};

exports.getMyForms = async (req, res, next) => {
  try {
    const forms = await Form.find({ user: req.user._id }).sort('-updatedAt').lean();
    res.json(forms);
  } catch (err) {
    next(err);
  }
};

exports.getFormById = async (req, res, next) => {
  try {
    const form = await Form.findOne({ _id: req.params.id, user: req.user._id });
    if (!form) return res.status(404).json({ message: 'Form not found' });
    res.json(form);
  } catch (err) {
    next(err);
  }
};

exports.updateForm = async (req, res, next) => {
  try {
    const form = await Form.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      {
        $set: {
          title: req.body.title,
          description: req.body.description,
          subtitle: req.body.subtitle,
          date: req.body.date,
          time: req.body.time,
          location: req.body.location,
          organizerName: req.body.organizerName,
          organizerEmail: req.body.organizerEmail,
          organizerPhone: req.body.organizerPhone,
          logo: req.body.logo,
          headerImage: req.body.headerImage,
          customDetails: req.body.customDetails,
          fields: req.body.fields,
          settings: req.body.settings,
          sourceTemplate: req.body.sourceTemplate,
          step1Labels: req.body.step1Labels,
        },
      },
      { new: true }
    );
    if (!form) return res.status(404).json({ message: 'Form not found' });
    res.json(form);
  } catch (err) {
    next(err);
  }
};

exports.deleteForm = async (req, res, next) => {
  try {
    console.log('Delete request for form id:', req.params.id);
    const form = await Form.findOneAndDelete({
      _id: req.params.id,
    });
    console.log('Delete result:', form);
    if (!form) return res.status(404).json({ message: 'Form not found' });
    res.json({ message: 'Form deleted' });
  } catch (err) {
    next(err);
  }
};

// public (no auth)
exports.getPublicForm = async (req, res, next) => {
  try {
    const form = await Form.findById(req.params.id).lean();
    if (!form || !form.settings?.isPublic) {
      return res.status(404).json({ message: 'Form not available' });
    }
    // don’t leak user data
    delete form.user;
    res.json(form);
  } catch (err) {
    next(err);
  }
};
