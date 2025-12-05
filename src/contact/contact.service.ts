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

      // Format the email content
      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px;">New Contact Form Submission</h2>
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 10px 0;"><strong>Name:</strong> ${escapedName}</p>
            <p style="margin: 10px 0;"><strong>Email:</strong> <a href="mailto:${escapedEmail}">${escapedEmail}</a></p>
            ${escapedPhone ? `<p style="margin: 10px 0;"><strong>Phone:</strong> ${escapedPhone}</p>` : ''}
          </div>
          <div style="margin: 20px 0;">
            <h3 style="color: #333;">Message:</h3>
            <p style="white-space: pre-wrap; line-height: 1.6; color: #555;">${escapedMessage}</p>
          </div>
        </div>
      `;

      const textContent = `
New Contact Form Submission

Name: ${name}
Email: ${email}
${phone ? `Phone: ${phone}` : ''}

Message:
${message}
      `.trim();

      // Use SMTP_USER as the sender address (required by most SMTP servers)
      // The "from" address must match the authenticated SMTP user
      await this.mailerService.sendMail({
        from: smtpUser, // Use authenticated SMTP user as sender
        to: 'contact@taktakmenu.com',
        replyTo: email, // Set reply-to to the form submitter's email
        subject: `Contact Form: ${name}`,
        text: textContent,
        html: emailContent,
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

