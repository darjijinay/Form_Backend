// Send professional HTML verification code email
exports.sendVerificationCodeHTML = async (toEmail, code) => {
  if (!toEmail || !code) return;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; box-shadow: 0 2px 8px #f0f0f0; padding: 32px 24px; background: #fff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <img src='logo.png' alt='FormCraft' style='height: 48px; margin-bottom: 8px;' />
        <h2 style="color: #4f46e5; margin: 0;">Verify your email</h2>
      </div>
      <p style="font-size: 16px; color: #333;">Thank you for registering with <b>FormCraft</b>! Please use the code below to verify your email address. This code will expire in <b>5 minutes</b>.</p>
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #4f46e5; background: #f3f4f6; border-radius: 8px; padding: 16px; text-align: center; margin: 24px 0;">${code}</div>
      <p style="font-size: 14px; color: #666;">If you did not request this, you can safely ignore this email.</p>
      <div style="margin-top: 32px; text-align: center; font-size: 12px; color: #aaa;">&copy; ${new Date().getFullYear()} FormCraft</div>
    </div>
  `;
  try {
    await getTransporter().sendMail({
      from: process.env.EMAIL_USER,
      to: toEmail,
      subject: 'Verify your email - FormCraft',
      html: htmlContent,
    });
    console.log('✅ [EMAIL SERVICE] Professional verification code sent to:', toEmail);
  } catch (err) {
    console.error('❌ [EMAIL SERVICE] Error sending professional verification code:', err.message);
  }
};

// Send verification code to user's email
exports.sendVerificationCode = async (toEmail, code) => {
  if (!toEmail || !code) return;
  try {
    await getTransporter().sendMail({
      from: process.env.EMAIL_USER,
      to: toEmail,
      subject: 'Your Verification Code',
      text: `Your verification code is: ${code}`,
      html: `<p>Your verification code is: <b>${code}</b></p>`
    });
    console.log('✅ [EMAIL SERVICE] Verification code sent to:', toEmail);
  } catch (err) {
    console.error('❌ [EMAIL SERVICE] Error sending verification code:', err.message);
  }
};
// server/src/services/emailService.js
const nodemailer = require('nodemailer');

// Lazy-load transporter to ensure env vars are loaded
let transporter = null;

function getTransporter() {
  if (!transporter) {
    console.log('[EMAIL] Initializing transporter with:');
    console.log('  HOST:', process.env.EMAIL_HOST);
    console.log('  PORT:', process.env.EMAIL_PORT);
    console.log('  USER:', process.env.EMAIL_USER);
    console.log('  PASS exists:', !!process.env.EMAIL_PASS);
    
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: false, // STARTTLS
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }
  return transporter;
}

/**
 * Send notification email when form is submitted
 * @param {string} notificationEmail - Email to send to
 * @param {Object} form - Form object with title, fields
 * @param {Array} answers - Array of {fieldId, value} pairs
 */
exports.sendResponseNotification = async (notificationEmail, form, answers) => {
  console.log('📧 [EMAIL SERVICE] Starting email send...');
  console.log('   Recipient:', notificationEmail);
  console.log('   From:', process.env.EMAIL_USER);
  console.log('   Has credentials:', !!process.env.EMAIL_USER && !!process.env.EMAIL_PASS);
  
  if (!notificationEmail || !process.env.EMAIL_USER) {
    console.log('❌ [EMAIL SERVICE] Skipped: missing recipient or credentials');
    return;
  }

  try {
    // Build response body
    const fieldMap = {};
    form.fields.forEach((f) => {
      fieldMap[f._id] = f.label;
    });

    const responseBody = answers
      .map((ans) => {
        const label = fieldMap[ans.fieldId] || ans.fieldId;
        const value = Array.isArray(ans.value) ? ans.value.join(', ') : ans.value;
        return `<tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>${label}</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${value}</td></tr>`;
      })
      .join('');

    const htmlContent = `
      <html>
        <body style="font-family: Arial, sans-serif; color: #333;">
          <h2>${form.title} - New Response</h2>
          <p>A new response has been submitted to your form.</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <thead>
              <tr style="background-color: #f0f0f0;">
                <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Field</th>
                <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Response</th>
              </tr>
            </thead>
            <tbody>
              ${responseBody}
            </tbody>
          </table>
          <p style="margin-top: 20px; color: #666; font-size: 12px;">
            This is an automated notification from FormCraft.
          </p>
        </body>
      </html>
    `;

    await getTransporter().sendMail({
      from: process.env.EMAIL_USER,
      to: notificationEmail,
      subject: `New Response: ${form.title}`,
      html: htmlContent,
    });

    console.log('✅ [EMAIL SERVICE] Email sent successfully to:', notificationEmail);
  } catch (err) {
    console.error('❌ [EMAIL SERVICE] Error sending email:', err.message);
    // Don't throw - don't block form submission if email fails
  }
};
