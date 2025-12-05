# Email Deliverability Guide

## Why Emails Go to Spam

Emails can end up in spam folders due to several factors. This guide helps you improve email deliverability.

## Code Improvements (Already Applied)

✅ **Proper Email Headers**: Added Message-ID, X-Mailer, and other headers
✅ **Better HTML Structure**: Professional email template with proper HTML structure
✅ **Text Alternative**: Plain text version included
✅ **Proper From Address**: Uses authenticated SMTP user

## DNS Configuration (REQUIRED)

To prevent emails from going to spam, you **MUST** configure these DNS records for your domain:

### 1. SPF Record (Sender Policy Framework)

Add this TXT record to your domain's DNS:

```
Type: TXT
Name: @ (or your domain)
Value: v=spf1 include:smtp.hostinger.com ~all
```

**For Hostinger specifically:**
```
v=spf1 include:hostinger.com ~all
```

### 2. DKIM Record (DomainKeys Identified Mail)

Hostinger should provide DKIM keys. Check your Hostinger email settings for:
- DKIM selector (usually `default` or `hostinger`)
- Public key

Add this TXT record:
```
Type: TXT
Name: default._domainkey (or selector._domainkey)
Value: [DKIM public key from Hostinger]
```

### 3. DMARC Record (Domain-based Message Authentication)

Add this TXT record:
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:admin@taktakmenu.com; ruf=mailto:admin@taktakmenu.com; pct=100
```

**DMARC Policies:**
- `p=none` - Monitor only (start here)
- `p=quarantine` - Send suspicious emails to spam
- `p=reject` - Reject suspicious emails (use after testing)

## Additional Recommendations

### 1. Use a Dedicated Email Address
- Use `noreply@taktakmenu.com` or `contact@taktakmenu.com` instead of generic addresses
- Ensure the email address exists and can receive replies

### 2. Warm Up Your Domain
- Start with low email volumes
- Gradually increase sending volume
- Build sender reputation over time

### 3. Monitor Your Reputation
- Check your domain's reputation on:
  - [MXToolbox](https://mxtoolbox.com/)
  - [Mail-Tester](https://www.mail-tester.com/)
  - [Sender Score](https://www.senderscore.org/)

### 4. Avoid Spam Triggers
- ✅ Don't use ALL CAPS in subject lines
- ✅ Don't use excessive exclamation marks (!!!)
- ✅ Don't use spam words like "FREE", "CLICK HERE", "URGENT"
- ✅ Include proper text version (already done)
- ✅ Use proper HTML structure (already done)

### 5. Test Your Emails
Use these tools to test:
- [Mail-Tester](https://www.mail-tester.com/) - Get a score out of 10
- [MXToolbox Blacklist Check](https://mxtoolbox.com/blacklists.aspx)
- Send test emails to Gmail, Outlook, Yahoo

## Hostinger-Specific Setup

1. **Log into Hostinger Control Panel**
2. **Go to Email → Email Accounts**
3. **Find your email account → Click "Manage"**
4. **Check "Email Authentication" section** for:
   - SPF status
   - DKIM keys
   - DMARC settings

5. **Copy the DKIM public key** and add it to your DNS

## Verification Steps

After adding DNS records:

1. **Wait 24-48 hours** for DNS propagation
2. **Verify SPF**: `nslookup -type=TXT taktakmenu.com`
3. **Verify DKIM**: `nslookup -type=TXT default._domainkey.taktakmenu.com`
4. **Verify DMARC**: `nslookup -type=TXT _dmarc.taktakmenu.com`
5. **Test with Mail-Tester**: Send an email and check the score

## Quick Checklist

- [ ] SPF record added to DNS
- [ ] DKIM record added to DNS
- [ ] DMARC record added to DNS
- [ ] DNS records verified (wait 24-48 hours)
- [ ] Tested with Mail-Tester (score > 8/10)
- [ ] Email address exists and can receive mail
- [ ] Sender reputation checked on MXToolbox

## Common Issues

### "Emails still going to spam after DNS setup"
- Wait longer for DNS propagation (can take up to 48 hours)
- Check if your IP is blacklisted
- Verify all DNS records are correct
- Start with `p=none` for DMARC, then gradually increase

### "Can't find DKIM keys in Hostinger"
- Contact Hostinger support
- Check if DKIM is enabled for your email account
- Some providers require enabling DKIM in account settings

### "SPF record not working"
- Ensure the SPF record includes your SMTP server
- Check for multiple SPF records (only one allowed)
- Verify the record syntax is correct

## Need Help?

If emails are still going to spam after following this guide:
1. Check your Mail-Tester score
2. Verify all DNS records are correct
3. Contact Hostinger support for DKIM keys
4. Consider using a professional email service (SendGrid, Mailgun, AWS SES)

