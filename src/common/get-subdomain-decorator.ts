import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';

export const GetSubdomain = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const subdomain = (request as any).tenantSubdomain;
    if (!subdomain) {
      throw new BadRequestException('Subdomain not found in request. Please provide x-tenant-subdomain header or use subdomain in hostname.');
    }
    return subdomain;
  },
);

