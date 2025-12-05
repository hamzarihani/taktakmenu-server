import { Injectable, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { ContactDto } from './dtos/contact.dto';

@Injectable()
export class ContactService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async sendContactEmail(dto: ContactDto): Promise<{ message: string }> {
    // Validate SMTP configuration
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');

    if (!smtpHost || !smtpUser || !smtpPass) {
      console.error('SMTP configuration is missing:', {
        hasHost: !!smtpHost,
        hasUser: !!smtpUser,
        hasPass: !!smtpPass,
      });
      throw new InternalServerErrorException(
        'Email service is not configured. Please contact the administrator.',
      );
    }

    try {
      const { name, email, phone, message } = dto;

      // Escape HTML to prevent XSS
      const escapeHtml = (text: string): string => {
        const map: { [key: string]: string } = {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#039;',
        };
        return text.replace(/[&<>"']/g, (m) => map[m]);
      };

      const escapedName = escapeHtml(name);
      const escapedEmail = escapeHtml(email);
      const escapedPhone = phone ? escapeHtml(phone) : '';
      const escapedMessage = escapeHtml(message).replace(/\n/g, '<br>');

      // Format the email content with better structure to avoid spam filters
      const emailContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Contact Form Client</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f4f4;">
    <tr>
      <td style="padding: 20px 0;">
        <table role="presentation" style="width: 600px; margin: 0 auto; background-color: #ffffff; border-collapse: collapse;">
          <tr>
            <td style="padding: 30px; background-color: #ffffff;">
              <h1 style="margin: 0 0 20px 0; color: #333333; font-size: 24px; font-weight: bold; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px;">
                New Contact Form Client
              </h1>
              
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f9f9f9; border-radius: 5px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 8px 0; color: #333333; font-size: 14px; line-height: 1.6;">
                      <strong style="color: #555555;">Name:</strong><br>
                      <span style="color: #333333;">${escapedName}</span>
                    </p>
                    <p style="margin: 8px 0; color: #333333; font-size: 14px; line-height: 1.6;">
                      <strong style="color: #555555;">Email:</strong><br>
                      <a href="mailto:${escapedEmail}" style="color: #0066cc; text-decoration: none;">${escapedEmail}</a>
                    </p>
                    ${escapedPhone ? `
                    <p style="margin: 8px 0; color: #333333; font-size: 14px; line-height: 1.6;">
                      <strong style="color: #555555;">Phone:</strong><br>
                      <span style="color: #333333;">${escapedPhone}</span>
                    </p>
                    ` : ''}
                  </td>
                </tr>
              </table>
              
              <div style="margin: 20px 0;">
                <h2 style="margin: 0 0 10px 0; color: #333333; font-size: 18px; font-weight: bold;">Message:</h2>
                <p style="margin: 0; white-space: pre-wrap; line-height: 1.6; color: #555555; font-size: 14px; background-color: #ffffff; padding: 15px; border-left: 3px solid #0066cc;">
                  ${escapedMessage}
                </p>
              </div>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center; color: #999999; font-size: 12px;">
                <p style="margin: 0;">This is an automated message from TaktakMenu Contact Form</p>
                <p style="margin: 5px 0 0 0;">Please reply directly to this email to respond to ${escapedName}</p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `;

      const textContent = `
New Contact Form Submission

Name: ${name}
Email: ${email}
${phone ? `Phone: ${phone}` : ''}

Message:
${message}
      `.trim();

      // Get CC emails from environment variable (comma-separated list)
      const ccEmailsEnv = this.configService.get<string>('CONTACT_CC_EMAILS');
      const ccEmails = ccEmailsEnv
        ? ccEmailsEnv.split(',').map((email) => email.trim()).filter((email) => email.length > 0)
        : [];

      // Generate Message-ID for better email tracking
      const messageId = `<${Date.now()}-${Math.random().toString(36).substring(7)}@taktakmenu.com>`;
      
      // Use SMTP_USER as the sender address (required by most SMTP servers)
      // The "from" address must match the authenticated SMTP user
      await this.mailerService.sendMail({
        from: `"TaktakMenu Contact Form" <${smtpUser}>`, // Use authenticated SMTP user as sender with display name
        to: 'contact@taktakmenu.com',
        cc: ccEmails.length > 0 ? ccEmails : undefined, // Add CC emails if configured
        replyTo: email, // Set reply-to to the form submitter's email
        subject: `Contact Form: ${name}`,
        text: textContent,
        html: emailContent,
        // Add headers to improve deliverability and reduce spam score
        headers: {
          'Message-ID': messageId,
          'X-Mailer': 'TaktakMenu Platform',
          'X-Priority': '3', // Normal priority
          'Importance': 'normal',
          'Precedence': 'bulk',
          'Auto-Submitted': 'auto-generated',
          'List-Unsubscribe': `<mailto:${smtpUser}?subject=unsubscribe>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          'Return-Path': smtpUser,
        },
      });

      return { message: 'Your message has been sent successfully. We will get back to you soon!' };
    } catch (error) {
      console.error('Failed to send contact email:', error);
      
      // Provide more specific error messages
      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
        const smtpPort = this.configService.get<string>('SMTP_PORT') || '587';
        console.error('SMTP Connection Error:', {
          code: error.code,
          host: smtpHost,
          port: smtpPort,
          message: error.message,
        });
        
        let errorMessage = 'Unable to connect to email server. ';
        if (smtpPort === '465') {
          errorMessage += 'Port 465 requires SSL/TLS. Please verify your SMTP settings.';
        } else if (smtpPort === '587') {
          errorMessage += 'Port 587 uses STARTTLS. Please verify your SMTP settings.';
        } else {
          errorMessage += 'Please check your SMTP host and port configuration.';
        }
        
        throw new InternalServerErrorException(errorMessage);
      }

      if (error.code === 'EAUTH') {
        console.error('SMTP Authentication Error:', {
          user: smtpUser,
        });
        throw new InternalServerErrorException(
          'Email authentication failed. Please check your SMTP credentials.',
        );
      }

      if (error.code === 'EENVELOPE') {
        console.error('SMTP Envelope Error:', {
          code: error.code,
          response: error.response,
          responseCode: error.responseCode,
          rejected: error.rejected,
        });
        throw new InternalServerErrorException(
          'Email address rejected by server. The sender address must match your SMTP account email.',
        );
      }

      // Generic error
      throw new InternalServerErrorException(
        'Could not send your message. Please try again later.',
      );
    }
  }
}

