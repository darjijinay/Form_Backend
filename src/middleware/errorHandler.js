// server/src/middleware/errorHandler.js
// Centralized error handler for Express
module.exports = (err, req, res, next) => {
  console.error(err);

  let statusCode = res.statusCode !== 200 ? res.statusCode : 500;

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    statusCode = 400;
    err.message = 'Invalid ID format';
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    statusCode = 400;
    // Attempt to extract the duplicated field and value for a clearer message
    try {
      const key = err.keyValue && Object.keys(err.keyValue)[0];
      const val = key ? err.keyValue[key] : undefined;
      if (key) {
        // common case: email duplicate
        err.message = `${key.charAt(0).toUpperCase() + key.slice(1)} already exists`;
        if (val) err.message += `: ${val}`;
      } else {
        err.message = 'Duplicate field value entered';
      }
    } catch (e) {
      err.message = 'Duplicate field value entered';
    }
  }

  // Validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    err.message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
  }

  res.status(statusCode).json({
    message: err.message || 'Server error',
  });
};
