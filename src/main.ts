import * as dotenv from 'dotenv';
dotenv.config();

import { validateEnvironment } from './config/env.validation';
validateEnvironment();

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as path from 'path';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { LoggingInterceptor } from './observability/logging.interceptor';
import { HttpExceptionFilter } from './observability/http-exception.filter';
import { SlackService } from './slack/slack.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Security headers via Helmet (relaxed CSP to permit inline styles/scripts for demo dashboard)
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false
    })
  );

  // CORS Configuration
  app.enableCors({
    origin: process.env.ALLOWED_ORIGIN || '*',
    credentials: true
  });

  // Seamless Ngrok-to-Render Redirect:
  // If traffic arrives via an Ngrok tunnel, seamlessly 302-redirect to the 24/7 Render Cloud URL
  // (Exempt internal HTTPS email relay calls so local server dispatches real Gmail)
  app.use((req: any, res: any, next: any) => {
    if (req.originalUrl?.includes('internal/relay-email') || req.url?.includes('internal/relay-email')) {
      return next();
    }
    const host = (req.headers['x-forwarded-host'] || req.headers.host || '').toString().toLowerCase();
    if (host.includes('ngrok-free.app') || host.includes('ngrok.io')) {
      const publicBaseUrl = (process.env.APP_BASE_URL || process.env.PUBLIC_APP_URL || process.env.RENDER_EXTERNAL_URL || 'https://koya-proposal-studio.onrender.com').replace(/\/+$/, '');
      const targetUrl = `${publicBaseUrl}${req.originalUrl || req.url}`;
      return res.redirect(302, targetUrl);
    }
    next();
  });

  // Global Observability Logging Interceptor (structured JSON logs with request ID & timing)
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Global Exception Filter (catches unhandled exceptions & dispatches 5xx alerts to Slack)
  const slackService = app.get(SlackService);
  app.useGlobalFilters(new HttpExceptionFilter(slackService));


  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`[Koya Proposal Studio - NestJS] Server running on http://localhost:${port}`);
  console.log(
    `[Koya Proposal Studio - NestJS] Observability: Healthz at http://localhost:${port}/healthz`
  );
  console.log(
    `[Koya Proposal Studio - NestJS] Model: ${process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001'}`
  );
  console.log(
    `[Koya Proposal Studio - NestJS] Supabase Sync: ${process.env.SUPABASE_URL || 'Offline / Local-Only'}`
  );
}

bootstrap().catch((err) => {
  console.error('CRITICAL BOOTSTRAP ERROR:', err);
  process.exit(1);
});
