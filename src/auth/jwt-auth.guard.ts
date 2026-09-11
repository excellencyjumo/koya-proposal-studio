import { Injectable, UnauthorizedException, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      throw err || new UnauthorizedException({
        success: false,
        error: 'Unauthenticated',
        message: 'Valid Bearer JWT token required. Please login via /api/auth/login.',
        code: 'AUTH_REQUIRED'
      });
    }
    return user;
  }
}
