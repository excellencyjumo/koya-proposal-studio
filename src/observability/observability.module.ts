import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { LoggingInterceptor } from './logging.interceptor';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [TerminusModule, SupabaseModule],
  controllers: [HealthController],
  providers: [LoggingInterceptor],
  exports: [LoggingInterceptor]
})
export class ObservabilityModule {}
