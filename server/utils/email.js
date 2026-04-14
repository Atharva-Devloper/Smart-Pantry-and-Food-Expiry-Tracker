const nodemailer = require('nodemailer');

let transporter;

// Initialize transporter based on environment
const initializeTransporter = async () => {
  if (process.env.EMAIL_HOST && process.env.EMAIL_PORT) {
    // Use custom SMTP if configured in .env
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
      auth: process.env.EMAIL_USER && process.env.EMAIL_PASS ? {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      } : undefined
    });
    console.log('Email transporter configured with custom SMTP');
  } else if (process.env.NODE_ENV === 'development') {
    // Use Ethereal temp email for development (no setup needed)
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log('✓ Email transporter configured with Ethereal (development)');
      console.log('Email preview URLs will be logged for each sent email');
    } catch (err) {
      console.error('Failed to create Ethereal test account:', err.message);
      transporter = null;
    }
  }
};

// Verify connection
const verifyConnection = () => {
  if (!transporter) {
    console.warn('⚠ Email transporter not initialized - emails will not be sent');
    return;
  }
  
  transporter.verify((error, success) => {
    if (error) {
      console.error('✗ Email service verification failed:', error.message);
    } else if (success) {
      console.log('✓ Email service verified and ready to send');
    }
  });
};

// Initialize when module loads
initializeTransporter().then(() => {
  verifyConnection();
});

const sendInvitationEmail = async (email, familyName, invitationToken, inviterName) => {
  try {
    if (!transporter) {
      console.warn('⚠ Email transporter not initialized - skipping email send');
      return { success: false, error: 'Email service not configured' };
    }

    const invitationLink = `${process.env.CLIENT_URL || 'http://localhost:5173'}/family/accept-invitation/${invitationToken}`;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@smartpantry.local',
      to: email,
      subject: `Join ${familyName} on Smart Pantry!`,
      html: `
        <h2>You're invited to join ${familyName}!</h2>
        <p>${inviterName} has invited you to join their family on Smart Pantry & Food Expiry Tracker.</p>
        
        <p>
          <strong>Family:</strong> ${familyName}<br>
          <strong>Invited by:</strong> ${inviterName}
        </p>
        
        <p>Click the link below to accept the invitation:</p>
        <p>
          <a href="${invitationLink}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Accept Invitation
          </a>
        </p>
        
        <p>Or paste this link in your browser:</p>
        <p><code>${invitationLink}</code></p>
        
        <p>This invitation will expire in 7 days.</p>
        
        <hr>
        <p>Best regards,<br>Smart Pantry & Food Expiry Tracker Team</p>
      `,
      text: `
        You're invited to join ${familyName}!

        ${inviterName} has invited you to join their family on Smart Pantry & Food Expiry Tracker.

        Family: ${familyName}
        Invited by: ${inviterName}

        Click the link below to accept the invitation:
        ${invitationLink}

        This invitation will expire in 7 days.

        Best regards,
        Smart Pantry & Food Expiry Tracker Team
      `
    };

    console.log(`📧 Sending invitation email to ${email} for family "${familyName}"...`);
    const info = await transporter.sendMail(mailOptions);
    
    // For Ethereal test emails, show preview URL
    if (process.env.NODE_ENV === 'development' && nodemailer.getTestMessageUrl) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log('✓ Invitation email sent!');
        console.log('📬 Preview URL:', previewUrl);
        console.log('👉 Open this link in your browser to see the email');
      }
    } else {
      console.log('✓ Invitation email sent to:', email);
      console.log('   Message ID:', info.messageId);
    }
    
    return { success: true, messageId: info.messageId, previewUrl: nodemailer.getTestMessageUrl(info) };
  } catch (err) {
    console.error('❌ Failed to send invitation email:', err.message);
    console.error('   Recipient:', email);
    console.error('   Family:', familyName);
    // Don't throw - invitation is still created even if email fails
    return { success: false, error: err.message };
  }
};

module.exports = {
  sendInvitationEmail,
  transporter
};
