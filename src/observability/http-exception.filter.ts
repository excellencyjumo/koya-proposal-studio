import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common';
import { Request, Response } from 'express';
import { SlackService } from '../slack/slack.service';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly slackService?: SlackService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : (exception as any)?.message || 'Internal Server Error';

    const message =
      typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? (exceptionResponse as any).message || JSON.stringify(exceptionResponse)
        : String(exceptionResponse);

    // If server error (500 or higher), dispatch Slack system alert notification
    if (status >= 500) {
      this.logger.error(
        `[Production 5xx Error] ${request.method} ${request.url} - Status ${status} - ${message}`,
        (exception as any)?.stack
      );

      if (this.slackService) {
        this.slackService
          .dispatchSystemErrorNotification(
            `PRODUCTION_HTTP_${status}_ERROR`,
            `Unhandled error during ${request.method} ${request.url}: ${message}`,
            {
              status,
              path: request.url,
              method: request.method,
              stack: (exception as any)?.stack?.split('\n').slice(0, 4).join('\n')
            }
          )
          .catch((err) => {
            this.logger.warn(`Failed to dispatch Slack alert: ${err.message}`);
          });
      }
    }

    // Preserve standard NestJS error response payload
    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      response.status(status).json(exceptionResponse);
    } else {
      response.status(status).json({
        statusCode: status,
        message,
        timestamp: new Date().toISOString(),
        path: request.url
      });
    }
  }
}
