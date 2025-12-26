const path = require('path');
const fs = require('fs');

exports.uploadFile = (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    // Ensure uploads directory exists
    const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const filePath = `/uploads/${req.file.filename}`;
    res.status(201).json({ url: filePath, filename: req.file.filename });
  } catch (err) {
    next(err);
  }
};
