// server/src/controllers/auth.controller.js
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

exports.registerUser = async (req, res, next) => {
  try {
    console.log('Register request received:', req.body);
    let { name, email, password } = req.body;
    // normalize inputs
    if (name && typeof name === 'string') {
      name = name.trim();
    }
    if (email && typeof email === 'string') {
      email = email.trim().toLowerCase();
    }

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide all fields' });
    }

    // check duplicate email
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already used' });

    // check duplicate username (some DBs may have an index on `name`)
    const nameExists = await User.findOne({ name });
    if (nameExists) return res.status(400).json({ message: 'Username already exists' });

    const user = await User.create({ name, email, password });
    console.log('User created successfully:', user._id);

    res.status(201).json({
      token: generateToken(user._id),
      user: { _id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error('Registration error:', err);
    next(err);
  }
};

exports.loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

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
