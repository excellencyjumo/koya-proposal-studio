import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (user) {
      return user;
    }
    return {
      id: 'usr_anonymous',
      name: 'Sarah Chen (Default)',
      email: 'sarah.chen@koyatalent.com',
      role: 'sales',
      title: 'Senior Account Executive'
    };
  }
}
