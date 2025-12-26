// server/src/controllers/analytics.controller.js
const Form = require('../models/Form');
const Response = require('../models/Response');
const View = require('../models/View');
const mongoose = require('mongoose');
const {
  aggregateResponses,
  getSubmissionTimeline,
  getFormStats,
} = require('../utils/analyticsAggregator');

// record a unique view event for a form (per IP+userAgent+form per 24h)
exports.recordView = async (req, res, next) => {
  try {
    const { formId } = req.params;
    const ip = req.ip;
    const userAgent = req.get('user-agent') || '';
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24h window

    // Check if a view exists for this form, ip, userAgent in last 24h
    const existing = await View.findOne({
      form: formId,
      'meta.ip': ip,
      'meta.userAgent': userAgent,
      createdAt: { $gte: since },
    });

    if (!existing) {
      await View.create({
        form: formId,
        meta: { ip, userAgent },
      });
    }

    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
};

// overview across all forms for the current user
exports.getOverview = async (req, res, next) => {
  try {
    const forms = await Form.find({ user: req.user._id }).select('_id settings title').lean();
    const formIds = forms.map((f) => f._id);

    // total responses and per-form counts
    const responsesAgg = await Response.aggregate([
      { $match: { form: { $in: formIds } } },
      { $group: { _id: '$form', count: { $sum: 1 } } },
    ]);
    const responseMap = Object.fromEntries(responsesAgg.map((r) => [r._id.toString(), r.count]));
    const totalResponses = responsesAgg.reduce((acc, r) => acc + r.count, 0);

    // total views
    const viewsAgg = await View.aggregate([
      { $match: { form: { $in: formIds } } },
      { $group: { _id: '$form', count: { $sum: 1 } } },
    ]);
    const totalViews = viewsAgg.reduce((acc, v) => acc + v.count, 0);

    // daily timeseries last 30 days
    const today = new Date();
    const startDay = new Date(today);
    startDay.setDate(startDay.getDate() - 29);

    const dailyViews = await View.aggregate([
      { $match: { form: { $in: formIds }, createdAt: { $gte: startDay } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
    ]);
    const dailyResponses = await Response.aggregate([
      { $match: { form: { $in: formIds }, createdAt: { $gte: startDay } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
    ]);

    const fillDaily = (records) => {
      const map = Object.fromEntries(records.map((r) => [r._id, r.count]));
      const result = [];
      for (let i = 0; i < 30; i++) {
        const d = new Date(startDay);
        d.setDate(startDay.getDate() + i);
        const key = d.toISOString().slice(0, 10);
        result.push({ date: key, count: map[key] || 0 });
      }
      return result;
    };

    const dailyViewSeries = fillDaily(dailyViews);
    const dailyResponseSeries = fillDaily(dailyResponses);

    // monthly timeseries last 6 months
    const startMonth = new Date(today.getFullYear(), today.getMonth() - 5, 1);
    const monthlyViews = await View.aggregate([
      { $match: { form: { $in: formIds }, createdAt: { $gte: startMonth } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
    ]);
    const monthlyResponses = await Response.aggregate([
      { $match: { form: { $in: formIds }, createdAt: { $gte: startMonth } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
    ]);

    const fillMonthly = (records) => {
      const map = Object.fromEntries(records.map((r) => [r._id, r.count]));
      const result = [];
      for (let i = 0; i < 6; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() - 5 + i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        result.push({ month: key, count: map[key] || 0 });
      }
      return result;
    };

    const monthlyViewSeries = fillMonthly(monthlyViews);
    const monthlyResponseSeries = fillMonthly(monthlyResponses);

    // per-form summary
    const perForm = forms.map((f) => {
      const responses = responseMap[f._id.toString()] || 0;
      const viewsCount = (viewsAgg.find((v) => v._id.toString() === f._id.toString())?.count) || 0;
      const conversion = viewsCount > 0 ? Math.round((responses / viewsCount) * 100) : 0;
      return {
        id: f._id,
        name: f.title || 'Untitled',
        responses,
        views: viewsCount,
        status: f?.settings?.isPublic ? 'Active' : 'Draft',
        conversion,
      };
    });

    res.json({
      totalForms: forms.length,
      activeForms: forms.filter((f) => f?.settings?.isPublic).length,
      totalResponses,
      totalViews,
      dailyViewSeries,
      dailyResponseSeries,
      monthlyViewSeries,
      monthlyResponseSeries,
      perForm,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/forms/:formId/analytics - detailed form analytics
exports.getFormAnalytics = async (req, res, next) => {
  try {
    const { formId } = req.params;
    const { startDate, endDate, groupBy = 'daily' } = req.query;

    // Fetch form with auth check
    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    // Authorization removed: allow any authenticated user to view analytics

    // Build query filter
    const query = { form: formId };
    if (startDate || endDate) {
      query.submittedAt = {};
      if (startDate) query.submittedAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.submittedAt.$lte = end;
      }
    }

    // Fetch responses and views
    const responses = await Response.find(query).sort({ submittedAt: -1 });
    const views = await View.find({ form: formId });

    // Aggregate data
    const fieldAnalytics = aggregateResponses(form, responses);
    const timeline = getSubmissionTimeline(responses, groupBy);
    // Only required fields must be filled for completion
    const stats = getFormStats(form, responses, views);

    res.json({
      form: {
        _id: form._id,
        title: form.title,
        description: form.description,
      },
      stats,
      fieldAnalytics,
      timeline,
      responses: {
        total: responses.length,
        list: responses
          .slice(0, 10) // Last 10 responses
          .map((r) => ({
            _id: r._id,
            submittedAt: r.submittedAt,
            answers: r.answers,
          })),
      },
    });
  } catch (error) {
    console.error('❌ Error fetching analytics:', error);
    next(error);
  }
};

// GET /api/forms/:formId/analytics/responses - with filtering/search
exports.getFormResponses = async (req, res, next) => {
  try {
    const { formId } = req.params;
    const { page = 1, limit = 20, search, startDate, endDate } = req.query;

    // Authorization
    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    if (form.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Build query
    const query = { form: formId };
    if (startDate || endDate) {
      query.submittedAt = {};
      if (startDate) query.submittedAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.submittedAt.$lte = end;
      }
    }

    // Search in answers (simple substring match)
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { 'answers.value': { $regex: searchRegex } },
      ];
    }

    // Pagination
    const skip = (page - 1) * limit;
    const [responses, total] = await Promise.all([
      Response.find(query)
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Response.countDocuments(query),
    ]);

    res.json({
      responses,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('❌ Error fetching responses:', error);
    next(error);
  }
};

// GET /api/forms/:formId/analytics/field/:fieldId - detailed field analytics
exports.getFieldAnalytics = async (req, res, next) => {
  try {
    const { formId, fieldId } = req.params;

    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    if (form.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const field = form.fields.find((f) => f._id === fieldId);
    if (!field) {
      return res.status(404).json({ error: 'Field not found' });
    }

    const responses = await Response.find({ form: formId });
    const fieldResponses = [];

    responses.forEach((response) => {
      const answer = response.answers.find((a) => a.fieldId === fieldId);
      if (answer) {
        fieldResponses.push({
          value: answer.value,
          submittedAt: response.submittedAt,
        });
      }
    });

    // Build detailed analytics
    const analytics = {
      field: {
        _id: field._id,
        label: field.label,
        type: field.type,
      },
      totalResponses: fieldResponses.length,
      completionRate: responses.length > 0 
        ? ((fieldResponses.length / responses.length) * 100).toFixed(2)
        : 0,
      responses: fieldResponses,
    };

    // Add type-specific analysis
    if (['radio', 'dropdown', 'checkbox'].includes(field.type)) {
      const counts = {};
      fieldResponses.forEach((r) => {
        const val = Array.isArray(r.value) ? r.value.join(', ') : r.value;
        counts[val] = (counts[val] || 0) + 1;
      });
      analytics.distribution = counts;
    } else if (field.type === 'number') {
      const numbers = fieldResponses
        .map((r) => parseFloat(r.value))
        .filter((v) => !isNaN(v));
      if (numbers.length > 0) {
        analytics.stats = {
          min: Math.min(...numbers),
          max: Math.max(...numbers),
          avg: (numbers.reduce((a, b) => a + b, 0) / numbers.length).toFixed(2),
          median: numbers.sort((a, b) => a - b)[Math.floor(numbers.length / 2)],
        };
      }
    }

    res.json(analytics);
  } catch (error) {
    console.error('❌ Error fetching field analytics:', error);
    next(error);
  }
};
