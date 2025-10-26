import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getWelcomePage(): string {
    return 'Welcome to Academix saas platform';
  }
}
