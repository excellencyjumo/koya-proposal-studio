import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  MemoryHealthIndicator
} from '@nestjs/terminus';
import { StorageService } from '../db/storage.service';
import { SupabaseService } from '../supabase/supabase.service';
import { RedisService } from '../redis/redis.service';

@Controller()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
    private readonly storageService: StorageService,
    private readonly supabaseService: SupabaseService,
    private readonly redisService: RedisService
  ) {}

  @Get('healthz')
  async checkHealthz(): Promise<any> {
    const supabaseHealth = await this.supabaseService.checkStatus();
    const canWriteDb = this.storageService.canWrite();
    const anthropicConfigured = Boolean(process.env.ANTHROPIC_API_KEY);
    const redisConnected = this.redisService.isReady();


    let memoryStatus: any = { heap: 'ok', rss: 'ok' };
    try {
      const mem = await this.health.check([
        () => this.memory.checkHeap('memory_heap', 500 * 1024 * 1024),
        () => this.memory.checkRSS('memory_rss', 800 * 1024 * 1024)
      ]);
      memoryStatus = mem.info;
    } catch (e: any) {
      memoryStatus = { status: 'warning', details: e.message };
    }

    const isHealthy = anthropicConfigured && canWriteDb;

    return {
      status: isHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        anthropic_configured: anthropicConfigured,
        supabase_connected: Boolean(supabaseHealth.connected),
        supabase_project: supabaseHealth.project_id || 'not_configured',
        slack_webhook_configured: Boolean(process.env.SLACK_WEBHOOK_URL),
        redis_connected: redisConnected,
        db_writable: canWriteDb,

        uptime_seconds: Math.round(process.uptime()),
        version: '1.0.0',
        memory: memoryStatus
      }
    };
  }

  @Get('api/health')
  async checkApiHealth(): Promise<any> {
    return this.checkHealthz();
  }
}
