// server/src/routes/auth.routes.js
const router = require('express').Router();
const { registerUser, loginUser, getMe, verifyUserCode, resendVerificationCode } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');


// Registration & verification
router.post('/register', registerUser);
router.post('/verify', verifyUserCode);
router.post('/resend-code', resendVerificationCode);

// Login & profile
router.post('/login', loginUser);
router.get('/me', protect, getMe);

module.exports = router;
