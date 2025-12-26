// Analytics data aggregation utility
const aggregateResponses = (form, responses) => {
  const fieldMap = {}; // fieldId -> field metadata
  const fieldAnalytics = {}; // fieldId -> analytics data

  // Build field map for quick lookup
  form.fields.forEach((field) => {
    fieldMap[field._id] = field;
    fieldAnalytics[field._id] = {
      fieldId: field._id,
      label: field.label,
      type: field.type,
      totalResponses: 0, // Number of responses that answered this field
      uniqueValues: new Set(),
      values: [], // all values for this field
      counts: {}, // value -> count (for single/multiple choice)
      // Track when the field was added
      addedAt: field.createdAt ? new Date(field.createdAt) : (form.updatedAt ? new Date(form.updatedAt) : null),
      // Fallback: if no createdAt, use form updatedAt
    };
  });

  // For each field, determine the earliest response to consider (after field was added)
  const fieldEarliestDate = {};
  Object.values(fieldAnalytics).forEach((fa) => {
    // Use field.createdAt if available, else form.updatedAt, else null
    fieldEarliestDate[fa.fieldId] = fa.addedAt || null;
  });

  // Process each response
  responses.forEach((response) => {
    Object.keys(fieldAnalytics).forEach((fieldId) => {
      const analytics = fieldAnalytics[fieldId];
      // Only consider responses after the field was added
      if (fieldEarliestDate[fieldId] && new Date(response.createdAt) < fieldEarliestDate[fieldId]) return;
      const answer = response.answers.find(a => a.fieldId === fieldId);
      if (!answer) return;
      analytics.totalResponses++;
      const value = answer.value;
      // Handle different field types
      if (analytics.type === 'radio' || analytics.type === 'dropdown' || analytics.type === 'checkbox') {
        if (Array.isArray(value)) {
          value.forEach((v) => {
            analytics.counts[v] = (analytics.counts[v] || 0) + 1;
            analytics.uniqueValues.add(v);
          });
        } else {
          analytics.counts[value] = (analytics.counts[value] || 0) + 1;
          analytics.uniqueValues.add(value);
        }
      } else {
        analytics.uniqueValues.add(value);
        analytics.values.push(value);
      }
    });
  });

  // For each field, count the number of responses that could have answered it (submitted after field was added)
  const fieldPossibleResponses = {};
  Object.keys(fieldAnalytics).forEach((fieldId) => {
    const addedAt = fieldEarliestDate[fieldId];
    fieldPossibleResponses[fieldId] = addedAt
      ? responses.filter(r => new Date(r.createdAt) >= addedAt).length
      : responses.length;
  });

  // Convert to response-friendly format
  const result = {};
  Object.keys(fieldAnalytics).forEach((fieldId) => {
    const analytics = fieldAnalytics[fieldId];
    const field = fieldMap[fieldId];
    const possible = fieldPossibleResponses[fieldId] || 0;
    result[fieldId] = {
      fieldId: analytics.fieldId,
      label: analytics.label,
      type: analytics.type,
      totalResponses: analytics.totalResponses,
      completionRate: possible > 0 ? (analytics.totalResponses / possible) * 100 : 0,
    };

    // Build chart data based on field type
    if (
      field.type === 'radio' ||
      field.type === 'dropdown' ||
      field.type === 'checkbox'
    ) {
      result[fieldId].chartData = {
        type: 'pie',
        labels: Object.keys(analytics.counts),
        data: Object.values(analytics.counts),
        options: field.options || [],
      };
    } else if (field.type === 'rating') {
      result[fieldId].chartData = {
        type: 'bar',
        labels: field.options || ['1', '2', '3', '4', '5'],
        data: (field.options || ['1', '2', '3', '4', '5']).map(
          (opt) => analytics.counts[opt] || 0
        ),
      };
    } else if (field.type === 'number') {
      const numbers = analytics.values.map((v) => parseFloat(v)).filter((v) => !isNaN(v));
      if (numbers.length > 0) {
        result[fieldId].stats = {
          min: Math.min(...numbers),
          max: Math.max(...numbers),
          avg: (numbers.reduce((a, b) => a + b, 0) / numbers.length).toFixed(2),
          total: numbers.reduce((a, b) => a + b, 0),
        };
      }
    } else {
      result[fieldId].uniqueCount = analytics.uniqueValues.size;
    }
  });

  return result;
};

// Calculate submission timeline (grouped by date)
const getSubmissionTimeline = (responses, groupBy = 'daily') => {
  const timeline = {};

  responses.forEach((response) => {
    const date = new Date(response.submittedAt);
    let key;

    if (groupBy === 'daily') {
      key = date.toISOString().split('T')[0]; // YYYY-MM-DD
    } else if (groupBy === 'weekly') {
      const weekStart = new Date(date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      key = weekStart.toISOString().split('T')[0];
    } else if (groupBy === 'monthly') {
      key = date.toISOString().substring(0, 7); // YYYY-MM
    }

    timeline[key] = (timeline[key] || 0) + 1;
  });

  // Sort by date
  const sorted = Object.entries(timeline)
    .sort(([dateA], [dateB]) => new Date(dateA) - new Date(dateB))
    .map(([date, count]) => ({ date, submissions: count }));

  return sorted;
};

// Calculate overall form statistics (unique views, unique responders, professional completion rate)
// Completion rate: average percentage of fields (required + optional) filled per response
const getFormStats = (form, responses, views = []) => {
  const fieldIds = (form.fields || []).map(f => f._id);
  const totalFields = fieldIds.length;

  // For each response, count filled fields
  const responseCompletionRates = responses.map(r => {
    let filled = 0;
    fieldIds.forEach(fid => {
      if (r.answers.some(a => a.fieldId === fid && a.value !== null && a.value !== '')) {
        filled++;
      }
    });
    return totalFields > 0 ? (filled / totalFields) : 0;
  });

  // Average completion rate across all responses (as percent)
  const avgCompletionRate = responseCompletionRates.length > 0
    ? (responseCompletionRates.reduce((a, b) => a + b, 0) / responseCompletionRates.length) * 100
    : 0;

  // Unique responders (by IP+userAgent)
  const uniqueResponders = new Set(
    responses.map(r => `${r.meta?.ip || ''}|${r.meta?.userAgent || ''}`)
  );

  // Unique viewers (by IP+userAgent)
  const uniqueViewers = new Set(
    views.map(v => `${v.meta?.ip || ''}|${v.meta?.userAgent || ''}`)
  );

  const totalResponses = responses.length;
  const totalViews = views.length || 0;
  const totalUniqueViews = uniqueViewers.size;
  const totalUniqueResponders = uniqueResponders.size;

  const avgCompletionTime = calculateAvgCompletionTime(responses);

  return {
    totalViews,
    totalUniqueViews,
    totalResponses,
    totalUniqueResponders,
    completionRate: avgCompletionRate.toFixed(2),
    avgCompletionTime,
    respondentsToday: countResponsesInRange(responses, 1),
    respondentsThisWeek: countResponsesInRange(responses, 7),
    respondentsThisMonth: countResponsesInRange(responses, 30),
  };
};

// Helper: count responses in past N days
const countResponsesInRange = (responses, days) => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return responses.filter((r) => new Date(r.submittedAt) > cutoff).length;
};

// Helper: calculate average time to completion
const calculateAvgCompletionTime = (responses) => {
  if (responses.length === 0) return 0;
  // This is a placeholder - would need timestamps for when form was opened
  return null; // TODO: implement if form start time is tracked
};

module.exports = {
  aggregateResponses,
  getSubmissionTimeline,
  getFormStats,
};
