import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ContactService } from './contact.service';
import { ContactDto } from './dtos/contact.dto';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Send contact message', 
    description: 'Sends an email to contact@taktakmenu.com with the contact form data. No authentication required.' 
  })
  @ApiBody({ type: ContactDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Contact message sent successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Your message has been sent successfully. We will get back to you soon!'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Validation error - invalid input data' 
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Internal server error - failed to send email' 
  })
  async sendContactMessage(@Body() dto: ContactDto): Promise<{ message: string }> {
    return this.contactService.sendContactEmail(dto);
  }
}

