// server/src/controllers/auth.controller.js
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

exports.registerUser = async (req, res, next) => {
  try {
    console.log('Register request received:', req.body);
      let { name, email, password, confirmPassword } = req.body;
      // Email format validation (simple regex)
      const emailRegex = /^[\w-.]+@[\w-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid email address.' });
      }
    // normalize inputs
    if (name && typeof name === 'string') {
      name = name.trim();
    }
    if (email && typeof email === 'string') {
      email = email.trim().toLowerCase();
    }

    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: 'Please provide all fields' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    // check duplicate email
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already used' });

    // check duplicate username (some DBs may have an index on `name`)
    const nameExists = await User.findOne({ name });
    if (nameExists) return res.status(400).json({ message: 'Username already exists' });

    // Generate verification code and expiry
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationCodeExpires = Date.now() + 1 * 60 * 1000; // 1 minute

    const user = await User.create({
      name,
      email,
      password,
      emailVerified: false,
      verificationCode,
      verificationCodeExpires,
    });
    console.log('User created successfully:', user._id);

    // Send professional HTML email
    const emailService = require('../services/emailService');
    await emailService.sendVerificationCodeHTML(user.email, verificationCode);

    res.status(201).json({
      message: 'Account created. Verification code sent to your email. Please verify to continue.'
    });
  } catch (err) {
    console.error('Registration error:', err);
    next(err);
  }
};

// Verify code endpoint
exports.verifyUserCode = async (req, res, next) => {
  try {
    const { email, code } = req.body;
    const user = await User.findOne({ email }).select('+verificationCode +verificationCodeExpires +emailVerified');
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.emailVerified) return res.status(400).json({ message: 'User already verified' });
    if (!user.verificationCode || !user.verificationCodeExpires) return res.status(400).json({ message: 'No code set. Please resend code.' });
    if (user.verificationCode !== code) return res.status(400).json({ message: 'Invalid verification code' });
    if (Date.now() > user.verificationCodeExpires) return res.status(400).json({ message: 'Verification code expired' });
    
    // Mark as verified (first-time verification)
    const isFirstTimeVerification = !user.emailVerified;
    user.emailVerified = true;
    user.verificationCode = null;
    user.verificationCodeExpires = null;
    await user.save();
    
    // Send welcome email ONLY on first-time account verification
    if (isFirstTimeVerification) {
      const emailService = require('../services/emailService');
      await emailService.sendWelcomeEmail(user.email, user.name);
      console.log('✅ [AUTH] Welcome email triggered for new user:', user.email);
    }
    
    // Log in user after verification
    const generateToken = require('../utils/generateToken');
    res.json({
      token: generateToken(user._id),
      user: { _id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    next(err);
  }
};

// Resend code endpoint
exports.resendVerificationCode = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.emailVerified) return res.status(400).json({ message: 'User already verified' });
    // Generate new code and expiry
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationCodeExpires = Date.now() + 1 * 60 * 1000; // 1 minute
    user.verificationCode = verificationCode;
    user.verificationCodeExpires = verificationCodeExpires;
    await user.save();
    // Send professional HTML email
    const emailService = require('../services/emailService');
    await emailService.sendVerificationCodeHTML(user.email, verificationCode);
    res.json({ message: 'Verification code resent to your email.' });
  } catch (err) {
    next(err);
  }
};

exports.loginUser = async (req, res, next) => {
  try {
    const { email, password, code } = req.body;
    const user = await User.findOne({ email }).select('+password +emailVerified +emailVerificationCode');
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    // If not verified, handle code logic
    if (!user.emailVerified) {
      // If code is not provided, generate and send code
      if (!code) {
        // Generate a 6-digit code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.emailVerificationCode = verificationCode;
        await user.save();
        // Send code to user's email
        const emailService = require('../services/emailService');
        await emailService.sendVerificationCode(user.email, verificationCode);
        return res.status(200).json({ message: 'Verification code sent to your email. Please enter the code to complete login.' });
      }
      // If code is provided, check it
      if (user.emailVerificationCode !== code) {
        return res.status(401).json({ message: 'Invalid verification code.' });
      }
      // Code is correct, verify user
      user.emailVerified = true;
      user.emailVerificationCode = null;
      await user.save();
    }

    res.json({
      token: generateToken(user._id),
      user: { _id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    next(err);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
};

// Forgot password - send reset code
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // If a reset code already exists and hasn't expired, don't send another email
    if (user.resetCode && user.resetCodeExpires && Date.now() < user.resetCodeExpires) {
      return res.json({ message: 'Password reset code already sent. Please check your email.' });
    }

    // Generate reset code and expiry (1 minute)
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetCodeExpires = Date.now() + 1 * 60 * 1000; // 1 minute

    user.resetCode = resetCode;
    user.resetCodeExpires = resetCodeExpires;
    await user.save();

    // Send reset code email
    const emailService = require('../services/emailService');
    await emailService.sendPasswordResetCode(user.email, resetCode);

    res.json({ message: 'Password reset code sent to your email.' });
  } catch (err) {
    next(err);
  }
};

// Verify reset code
exports.verifyResetCode = async (req, res, next) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ message: 'Email and code are required' });

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+resetCode +resetCodeExpires');
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.resetCode || !user.resetCodeExpires) return res.status(400).json({ message: 'No reset code found. Please request a new one.' });
    if (user.resetCode !== code) return res.status(400).json({ message: 'Invalid reset code' });
    if (Date.now() > user.resetCodeExpires) return res.status(400).json({ message: 'Reset code expired. Please request a new one.' });

    res.json({ message: 'Code verified successfully' });
  } catch (err) {
    next(err);
  }
};

// Reset password with code
exports.resetPassword = async (req, res, next) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) return res.status(400).json({ message: 'Email, code, and new password are required' });

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password +resetCode +resetCodeExpires');
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.resetCode || !user.resetCodeExpires) return res.status(400).json({ message: 'No reset code found. Please request a new one.' });
    if (user.resetCode !== code) return res.status(400).json({ message: 'Invalid reset code' });
    if (Date.now() > user.resetCodeExpires) return res.status(400).json({ message: 'Reset code expired. Please request a new one.' });

    // Update password
    user.password = newPassword;
    user.resetCode = null;
    user.resetCodeExpires = null;
    await user.save();

    res.json({ message: 'Password reset successfully. You can now login with your new password.' });
  } catch (err) {
    next(err);
  }
};
