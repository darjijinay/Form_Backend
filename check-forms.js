// Check forms email settings
require('dotenv').config();
const mongoose = require('mongoose');
const Form = require('./src/models/Form');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('Connected to MongoDB\n');
  
  const forms = await Form.find({}).select('title settings').lean();
  
  console.log('=== FORMS WITH EMAIL SETTINGS ===\n');
  
  if (forms.length === 0) {
    console.log('No forms found in database.');
  } else {
    forms.forEach((f, idx) => {
      console.log(`Form ${idx + 1}:`);
      console.log('  Title:', f.title);
      console.log('  Notify on submission:', f.settings?.notifyOnSubmission || false);
      console.log('  Notification email:', f.settings?.notificationEmail || '(not set)');
      console.log('  Form ID:', f._id);
      console.log('');
    });
  }
  
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
