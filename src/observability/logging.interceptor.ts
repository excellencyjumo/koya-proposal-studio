import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest();
    const res = ctx.getResponse();

    // Attach or extract request ID
    const requestId = req.headers['x-request-id'] || uuidv4();
    req.id = requestId;
    res.setHeader('X-Request-Id', requestId);

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const userRole = req.user?.role || 'anonymous';
          const logPayload = {
            timestamp: new Date().toISOString(),
            request_id: requestId,
            method: req.method,
            path: req.originalUrl || req.url,
            status: res.statusCode,
            duration_ms: duration,
            user_role: userRole,
            user_email: req.user?.email || null
          };
          this.logger.log(JSON.stringify(logPayload));
        },
        error: (err) => {
          const duration = Date.now() - startTime;
          const status = err.status || 500;
          const logPayload = {
            timestamp: new Date().toISOString(),
            request_id: requestId,
            method: req.method,
            path: req.originalUrl || req.url,
            status,
            duration_ms: duration,
            error: err.message,
            stack: err.stack
          };
          this.logger.error(JSON.stringify(logPayload));
        }
      })
    );
  }
}
