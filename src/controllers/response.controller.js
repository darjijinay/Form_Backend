// server/src/controllers/response.controller.js
const Response = require('../models/Response');
const Form = require('../models/Form');
const { Parser } = require('json2csv');
const { sendResponseNotification, sendResponderCopy } = require('../services/emailService');

// Public: submit a response
exports.submitResponse = async (req, res, next) => {
  try {
    const { formId } = req.params;
    const { answers, sendCopy } = req.body;

    if (!Array.isArray(answers)) {
      return res.status(400).json({ message: 'Invalid submission payload.' });
    }

    const form = await Form.findById(formId).lean();
    if (!form || !form.settings?.isPublic) {
      return res.status(404).json({ message: 'Form not available' });
    }

    // Basic validation: ensure fieldIds exist in form
    const formFieldIds = new Set(form.fields.map((f) => f._id));
    const sanitizedAnswers = answers.filter((a) => formFieldIds.has(a.fieldId));

    // Determine responder email according to collection settings
    let responderEmail = null;
    const mode = form.settings?.collectEmails || 'none';
    
    console.log('=== RESPONDER EMAIL CHECK ===');
    console.log('collectEmails mode:', mode);
    
    // Check if form has any email field
    const emailField = form.fields.find((f) => f.type === 'email');
    console.log('Email field found:', !!emailField);
    
    if (mode === 'responder_input' || emailField) {
      const emailAnswer = emailField
        ? sanitizedAnswers.find((a) => a.fieldId === emailField._id)
        : null;
      console.log('Email answer value:', emailAnswer?.value);
      
      if (emailAnswer && emailAnswer.value) {
        responderEmail = String(emailAnswer.value).trim();
        console.log('✅ Responder email set to:', responderEmail);
      } else if (mode === 'responder_input') {
        // Only require email if collectEmails is explicitly set to responder_input
        return res.status(400).json({ message: 'Please provide your email address.' });
      }
    }

    // Determine copy preference respecting owner setting
    const sendCopySetting = typeof form.settings?.sendResponseCopy === 'string'
      ? form.settings.sendResponseCopy
      : (form.settings?.sendResponseCopy ? 'requested' : 'off');
    const responderWantsCopy = sendCopySetting === 'always' || (sendCopySetting === 'requested' && sendCopy);
    
    console.log('sendCopySetting:', sendCopySetting);
    console.log('sendCopy from request:', sendCopy);
    console.log('responderWantsCopy:', responderWantsCopy);
    console.log('responderEmail:', responderEmail);

    const response = await Response.create({
      form: form._id,
      answers: sanitizedAnswers,
      meta: {
        userAgent: req.headers['user-agent'],
        ip:
          req.headers['x-forwarded-for'] ||
          req.connection.remoteAddress ||
          '',
        email: responderEmail,
        sendCopy: responderWantsCopy,
      },
    });

    // Send email notification if enabled
    console.log('=== FORM SUBMISSION EMAIL CHECK ===');
    console.log('notifyOnSubmission:', form.settings?.notifyOnSubmission);
    console.log('notificationEmail:', form.settings?.notificationEmail);
    console.log('EMAIL_USER env:', process.env.EMAIL_USER);
    
    if (form.settings?.notifyOnSubmission && form.settings?.notificationEmail) {
      console.log('✅ Triggering email notification to:', form.settings.notificationEmail);
      sendResponseNotification(form.settings.notificationEmail, form, sanitizedAnswers).catch((err) => {
        console.error('❌ Failed to send notification email:', err.message);
      });
    } else {
      console.log('❌ Email notification skipped - notifyOnSubmission or notificationEmail missing');
    }

    // Send responder copy only when they opted in and provided an email
    console.log('=== RESPONDER COPY CHECK ===');
    console.log('responderWantsCopy:', responderWantsCopy);
    console.log('responderEmail:', responderEmail);
    
    if (responderWantsCopy && responderEmail) {
      console.log('✅ Triggering responder copy to:', responderEmail);
      sendResponderCopy(responderEmail, form, sanitizedAnswers).catch((err) => {
        console.error('❌ Failed to send responder copy:', err.message);
      });
    } else {
      console.log('❌ Responder copy skipped - responderWantsCopy:', responderWantsCopy, 'responderEmail:', responderEmail);
    }

    res.status(201).json({ message: 'Response submitted', responseId: response._id });
  } catch (err) {
    next(err);
  }
};

// Protected: list responses for a form (owner only)
exports.getResponsesForForm = async (req, res, next) => {
  try {
    const { formId } = req.params;

    const form = await Form.findOne({
      _id: formId,
      user: req.user._id,
    }).lean();

    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search = '',
    } = req.query;

    const query = { form: formId };
    if (search) {
      query.answers = {
        $elemMatch: {
          value: { $regex: search, $options: 'i' }
        }
      };
    }

    const sortOptions = {};
    if (sortBy === 'submittedAt' || sortBy === 'createdAt') {
      sortOptions.createdAt = sortOrder === 'asc' ? 1 : -1;
    } else {
      // Note: Sorting by arbitrary answer values is complex and not implemented yet.
      // Defaulting to createdAt for now.
      sortOptions.createdAt = sortOrder === 'asc' ? 1 : -1;
    }

    const totalResponses = await Response.countDocuments(query);
    const responses = await Response.find(query)
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    res.json({
      form,
      responses,
      pagination: {
        total: totalResponses,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalResponses / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

// Protected: export CSV
exports.exportResponsesCsv = async (req, res, next) => {
  try {
    const { formId } = req.params;

    const form = await Form.findOne({
      _id: formId,
      user: req.user._id,
    }).lean();

    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    const responses = await Response.find({ form: formId }).lean();

    // Build rows: one row per response, columns per field label
    const fieldMap = {};
    form.fields.forEach((f) => {
      fieldMap[f._id] = f.label;
    });

    const rows = responses.map((r) => {
      const row = { submittedAt: r.createdAt };
      if (r.meta?.email) row['Responder Email'] = r.meta.email;
      if (r.meta?.sendCopy) row['Send Copy Opt-in'] = r.meta.sendCopy;
      r.answers.forEach((ans) => {
        const key = fieldMap[ans.fieldId] || ans.fieldId;
        row[key] = ans.value;
      });
      return row;
    });

    const json2csv = new Parser();
    const csv = json2csv.parse(rows);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="responses-${formId}.csv"`
    );
    res.send(csv);
  } catch (err) {
    next(err);
  }
};
