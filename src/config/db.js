// server/src/config/db.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      autoIndex: true,
      serverSelectionTimeoutMS: 15000,
    });
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    console.log('⚠️  Server running WITHOUT database. Please set up MongoDB to enable data persistence.');
    // Don't exit - allow server to run without DB for development
  }
};

module.exports = connectDB;
