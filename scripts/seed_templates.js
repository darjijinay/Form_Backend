require('dotenv').config();
const mongoose = require('mongoose');
const Template = require('../src/models/Template');

const premadeTemplates = [
  {
    name: 'Contact Form',
    description: 'Simple contact form with name, email, and message fields',
    category: 'contact',
    isPremade: true,
    thumbnail: '📧',
    fields: [
      {
        type: 'short_text',
        label: 'Full Name',
        placeholder: 'Enter your full name',
        required: true,
        order: 0,
        width: 'full',
      },
      {
        type: 'email',
        label: 'Email Address',
        placeholder: 'your@email.com',
        required: true,
        order: 1,
        width: 'full',
      },
      {
        type: 'short_text',
        label: 'Subject',
        placeholder: 'What is this about?',
        required: false,
        order: 2,
        width: 'full',
      },
      {
        type: 'long_text',
        label: 'Message',
        placeholder: 'Type your message here...',
        required: true,
        order: 3,
        width: 'full',
      },
    ],
    settings: {
      allowMultipleSubmissions: true,
      requireLogin: false,
      notifyOnSubmit: true,
      customMessage: 'Thank you for contacting us! We will get back to you soon.',
    },
  },
  {
    name: 'Customer Feedback Survey',
    description: 'Collect customer satisfaction ratings and feedback',
    category: 'feedback',
    isPremade: true,
    thumbnail: '⭐',
    fields: [
      {
        type: 'short_text',
        label: 'Your Name',
        placeholder: 'Enter your name',
        required: true,
        order: 0,
        width: 'half',
      },
      {
        type: 'email',
        label: 'Email',
        placeholder: 'your@email.com',
        required: true,
        order: 1,
        width: 'half',
      },
      {
        type: 'rating',
        label: 'Overall Satisfaction',
        placeholder: 'Rate your experience',
        required: true,
        order: 2,
        width: 'full',
      },
      {
        type: 'radio',
        label: 'Would you recommend us?',
        options: ['Definitely', 'Probably', 'Not sure', 'Probably not', 'Definitely not'],
        required: true,
        order: 3,
        width: 'full',
      },
      {
        type: 'long_text',
        label: 'Additional Comments',
        placeholder: 'Share your thoughts...',
        required: false,
        order: 4,
        width: 'full',
      },
    ],
    settings: {
      allowMultipleSubmissions: false,
      requireLogin: false,
      notifyOnSubmit: true,
      customMessage: 'Thank you for your feedback!',
    },
  },
  {
    name: 'Event Registration',
    description: 'Complete event registration form with attendee details',
    category: 'registration',
    isPremade: true,
    thumbnail: '🎟️',
    fields: [
      {
        type: 'short_text',
        label: 'Full Name',
        placeholder: 'Enter your full name',
        required: true,
        order: 0,
        width: 'full',
      },
      {
        type: 'email',
        label: 'Email Address',
        placeholder: 'your@email.com',
        required: true,
        order: 1,
        width: 'half',
      },
      {
        type: 'short_text',
        label: 'Phone Number',
        placeholder: '+1234567890',
        required: true,
        order: 2,
        width: 'half',
      },
      {
        type: 'short_text',
        label: 'Company/Organization',
        placeholder: 'Your organization',
        required: false,
        order: 3,
        width: 'full',
      },
      {
        type: 'dropdown',
        label: 'Ticket Type',
        options: ['Early Bird', 'Regular', 'VIP', 'Student'],
        required: true,
        order: 4,
        width: 'half',
      },
      {
        type: 'number',
        label: 'Number of Attendees',
        placeholder: '1',
        required: true,
        order: 5,
        width: 'half',
      },
      {
        type: 'checkbox',
        label: 'Dietary Requirements',
        options: ['Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free', 'None'],
        required: false,
        order: 6,
        width: 'full',
      },
      {
        type: 'long_text',
        label: 'Special Requirements',
        placeholder: 'Any special accommodations needed?',
        required: false,
        order: 7,
        width: 'full',
      },
    ],
    settings: {
      allowMultipleSubmissions: false,
      requireLogin: false,
      notifyOnSubmit: true,
      customMessage: 'Registration successful! Check your email for confirmation.',
    },
  },
  {
    name: 'Job Application',
    description: 'Comprehensive job application form',
    category: 'registration',
    isPremade: true,
    thumbnail: '💼',
    fields: [
      {
        type: 'short_text',
        label: 'Full Name',
        placeholder: 'Enter your full name',
        required: true,
        order: 0,
        width: 'full',
      },
      {
        type: 'email',
        label: 'Email',
        placeholder: 'your@email.com',
        required: true,
        order: 1,
        width: 'half',
      },
      {
        type: 'short_text',
        label: 'Phone',
        placeholder: '+1234567890',
        required: true,
        order: 2,
        width: 'half',
      },
      {
        type: 'dropdown',
        label: 'Position Applied For',
        options: ['Software Engineer', 'Designer', 'Product Manager', 'Marketing', 'Sales', 'Other'],
        required: true,
        order: 3,
        width: 'full',
      },
      {
        type: 'short_text',
        label: 'Current Company',
        placeholder: 'Your current employer',
        required: false,
        order: 4,
        width: 'full',
      },
      {
        type: 'number',
        label: 'Years of Experience',
        placeholder: '0',
        required: true,
        order: 5,
        width: 'half',
      },
      {
        type: 'short_text',
        label: 'Expected Salary',
        placeholder: '$XXX,XXX',
        required: false,
        order: 6,
        width: 'half',
      },
      {
        type: 'file',
        label: 'Resume/CV',
        placeholder: 'Upload your resume',
        required: true,
        order: 7,
        width: 'full',
      },
      {
        type: 'long_text',
        label: 'Cover Letter',
        placeholder: 'Tell us why you want to join...',
        required: false,
        order: 8,
        width: 'full',
      },
    ],
    settings: {
      allowMultipleSubmissions: false,
      requireLogin: false,
      notifyOnSubmit: true,
      customMessage: 'Application submitted! We will review and get back to you.',
    },
  },
  {
    name: 'Quick Survey',
    description: 'Simple multi-choice survey template',
    category: 'survey',
    isPremade: true,
    thumbnail: '📊',
    fields: [
      {
        type: 'short_text',
        label: 'Your Name (Optional)',
        placeholder: 'Enter your name',
        required: false,
        order: 0,
        width: 'full',
      },
      {
        type: 'radio',
        label: 'How did you hear about us?',
        options: ['Social Media', 'Search Engine', 'Friend Referral', 'Advertisement', 'Other'],
        required: true,
        order: 1,
        width: 'full',
      },
      {
        type: 'checkbox',
        label: 'Which features interest you?',
        options: ['Feature A', 'Feature B', 'Feature C', 'Feature D'],
        required: true,
        order: 2,
        width: 'full',
      },
      {
        type: 'rating',
        label: 'Rate your experience',
        placeholder: 'Select rating',
        required: true,
        order: 3,
        width: 'full',
      },
      {
        type: 'long_text',
        label: 'Any suggestions?',
        placeholder: 'We appreciate your feedback...',
        required: false,
        order: 4,
        width: 'full',
      },
    ],
    settings: {
      allowMultipleSubmissions: false,
      requireLogin: false,
      notifyOnSubmit: false,
      customMessage: 'Thank you for completing our survey!',
    },
  },
];

async function seedTemplates() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected...');

    // Clear existing premade templates
    await Template.deleteMany({ isPremade: true });
    console.log('Cleared existing premade templates');

    // Insert new templates
    await Template.insertMany(premadeTemplates);
    console.log(`✅ Successfully seeded ${premadeTemplates.length} premade templates`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding templates:', error);
    process.exit(1);
  }
}

seedTemplates();
