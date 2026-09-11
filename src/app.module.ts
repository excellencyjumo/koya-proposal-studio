import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import * as path from 'path';
import * as fs from 'fs';
import { DbModule } from './db/db.module';
import { SupabaseModule } from './supabase/supabase.module';
import { ClaudeModule } from './claude/claude.module';
import { ObservabilityModule } from './observability/observability.module';
import { AuthModule } from './auth/auth.module';
import { SlackModule } from './slack/slack.module';
import { RedisModule } from './redis/redis.module';
import { ProposalModule } from './proposals/proposal.module';
import { EmailModule } from './email/email.module';

const clientDistPath = path.join(process.cwd(), 'client', 'dist');
const fallbackPublicPath = path.join(process.cwd(), 'public');
const staticRoot = fs.existsSync(clientDistPath) ? clientDistPath : fallbackPublicPath;

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: staticRoot,
      exclude: ['/api/(.*)', '/healthz']
    }),
    DbModule,
    SupabaseModule,
    ClaudeModule,
    ObservabilityModule,
    AuthModule,
    SlackModule,
    RedisModule,
    EmailModule,
    ProposalModule
  ]
})

export class AppModule {}
