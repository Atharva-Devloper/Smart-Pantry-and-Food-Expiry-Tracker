# Email Setup & Testing Guide

## 📧 Email Configuration

The Smart Pantry app now uses **NodeMailer** for sending family invitation emails. The system automatically configures itself based on your environment.

### Development Mode (Default) 

By default in development, the app uses **Ethereal Email** - a free testing service that requires zero setup!

1. **No configuration needed** - Leave `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS` empty in `.env`
2. **Automatic test account creation** - First time you enable emails, a temporary Ethereal account is auto-generated
3. **Email preview URLs** - Check your server console for a preview link to see your emails

#### How to use in development:

```bash
# 1. Restart your server
npm run dev

# 2. Check the console for verification message
# You should see: "✓ Email transporter configured with Ethereal (development)"

# 3. Send a test email
# Option A: Via API test endpoint
curl -X POST http://localhost:5000/api/family/test-email \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"recipientEmail":"test@example.com"}'

# Option B: Use the app - Create family → Invite member
# Check server console for Ethereal preview URL
# Click the link to see your email in the browser
```

#### What happens:
- When you send an invitation, the console will show:
  ```
  📧 Sending invitation email to user@example.com...
  ✓ Invitation email sent!
  📬 Preview URL: https://ethereal.email/message/...
  👉 Open this link in your browser to see the email
  ```

---

## Production Mode (Gmail)

For real email sending in production, use **Gmail SMTP**:

### Step 1: Enable 2-Factor Authentication on Gmail
1. Go to [myaccount.google.com/security](https://myaccount.google.com/security)
2. Enable "2-Step Verification"

### Step 2: Generate App Password
1. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Select "Mail" and "Windows Computer"
3. Google will generate a 16-character password

### Step 3: Update `.env`
```env
NODE_ENV=production

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-character-app-password
EMAIL_SECURE=false
EMAIL_FROM=Smart Pantry <your-email@gmail.com>
```

### Step 4: Test
```bash
npm run dev
# Check console for: "✓ Email service verified and ready to send"
```

---

## Troubleshooting

### Issue: "Email service not configured"
**Solution:** Check your `.env` file - make sure you have the correct configuration for your mode

### Issue: "Failed to send invitation email"
**Possible causes:**
1. **Network issues** - Internet connection needed
2. **Gmail 2FA not enabled** - Required for app passwords
3. **Wrong app password** - Regenerate it from Google Account
4. **Timeout** - Some networks block SMTP; try a different network

**Debug steps:**
```bash
# 1. Check server logs for detailed error
npm run dev

# 2. Test with test endpoint
curl -X POST http://localhost:5000/api/family/test-email \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"recipientEmail":"your-test-email@gmail.com"}'

# 3. Check response for previewUrl (Ethereal) or error details
```

### Issue: Ethereal preview URL not working
**Solution:** 
- The URL expires after 24 hours
- Send a new test email for a fresh URL
- Make sure you're opening the correct link from the console

---

## API Endpoints

### Test Email (Development)
```
POST /api/family/test-email
Authorization: Bearer token
Content-Type: application/json

{
  "recipientEmail": "test@example.com"
}

Response:
{
  "message": "Test email sent",
  "emailSent": true,
  "details": {
    "recipient": "test@example.com",
    "previewUrl": "https://ethereal.email/message/..."
  }
}
```

### Send Invitation
```
POST /api/family/:familyId/invite
Authorization: Bearer token
Content-Type: application/json

{
  "email": "user@example.com",
  "role": "member"
}

Response:
{
  "message": "Invitation sent successfully",
  "emailSent": true,
  "invitation": {
    "email": "user@example.com",
    "role": "member",
    "expiresAt": "2026-04-21T12:00:00Z"
  }
}
```

---

## Console Messages Explained

| Message | Meaning | Action |
|---------|---------|--------|
| `✓ Email transporter configured with Ethereal` | Development mode active, emails will be sent to preview | Click preview URLs in console |
| `✓ Email service ready` | SMTP connection verified | You can send emails |
| `✗ Email service verification failed` | SMTP connection issue | Check `.env` credentials |
| `📧 Sending invitation email to...` | Email is being sent | Wait for completion message |
| `📬 Preview URL: https://...` | Ethereal preview ready | Click to see the email |
| `❌ Failed to send invitation email` | Connection timeout or authentication failed | Check error details below message |

---

## Next Steps

1. **Test the setup:**
   - Restart server with `npm run dev`
   - Check console for configuration message
   - Use test endpoint or send an actual invitation

2. **For production deployment:**
   - Set up Gmail app password (see steps above)
   - Update `.env` with production SMTP
   - Change `NODE_ENV=production`
   - Restart server

3. **Monitor emails:**
   - Check console for preview URLs (development)
   - Check inbox for real emails (production)
   - Adjust email templates as needed in `server/utils/email.js`

---

## Questions?

- Check server console for detailed logs
- Error messages include recipient email and specific failure reasons
- Test endpoint helps verify SMTP configuration
