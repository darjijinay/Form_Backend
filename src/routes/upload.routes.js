const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const { uploadFile } = require('../controllers/upload.controller');

// store files in backend/uploads with original extension and unique name
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dest = path.join(__dirname, '..', '..', 'uploads');
    try {
      if (!require('fs').existsSync(dest)) require('fs').mkdirSync(dest, { recursive: true });
    } catch (e) {
      // ignore
    }
    cb(null, dest);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({ storage });

router.post('/', upload.single('file'), uploadFile);

module.exports = router;
