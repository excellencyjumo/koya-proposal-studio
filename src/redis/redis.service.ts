import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected = false;
  private inMemoryFallback = new Map<string, { value: any; expiresAt: number }>();

  async onModuleInit() {
    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

    try {
      this.client = new Redis(redisUrl, {
        lazyConnect: true,
        connectTimeout: 2000,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        retryStrategy: () => null // Do not retry continuously if offline
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log(`[RedisService] Connected to Redis cache at ${redisUrl.replace(/:[^:@]+@/, ':***@')}`);
      });

      this.client.on('error', (err) => {
        if (this.isConnected) {
          this.logger.warn(`[RedisService] Connection error: ${err.message}`);
        }
        this.isConnected = false;
      });

      this.client.on('close', () => {
        this.isConnected = false;
      });

      // Attempt initial connection with a short timeout
      await Promise.race([
        this.client.connect(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 1500))
      ]);
      this.isConnected = true;
      this.logger.log('[RedisService] Redis cache actively operational.');
    } catch (err: any) {
      this.isConnected = false;
      this.logger.log(
        `[RedisService] Redis cache offline (${err.message}). Seamlessly operating in resilient in-memory caching mode.`
      );
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        // ignore disconnect errors
      }
    }
  }

  isReady(): boolean {
    return this.isConnected;
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.isConnected && this.client) {
      try {
        const raw = await this.client.get(key);
        if (raw) return JSON.parse(raw) as T;
      } catch (err) {
        // Fall back to memory on Redis error
      }
    }

    const cached = this.inMemoryFallback.get(key);
    if (!cached) return null;
    if (Date.now() > cached.expiresAt) {
      this.inMemoryFallback.delete(key);
      return null;
    }
    return cached.value as T;
  }

  async set(key: string, value: any, ttlSeconds = 3600): Promise<void> {
    const serialized = JSON.stringify(value);

    if (this.isConnected && this.client) {
      try {
        await this.client.set(key, serialized, 'EX', ttlSeconds);
        return;
      } catch (err) {
        // Fall through to memory
      }
    }

    this.inMemoryFallback.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000
    });
  }

  async del(key: string): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        await this.client.del(key);
      } catch {
        // Fall through
      }
    }
    this.inMemoryFallback.delete(key);
  }

  async delPattern(pattern: string): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        const keys = await this.client.keys(pattern);
        if (keys.length > 0) {
          await this.client.del(...keys);
        }
      } catch {
        // Fall through
      }
    }

    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const k of this.inMemoryFallback.keys()) {
      if (regex.test(k)) {
        this.inMemoryFallback.delete(k);
      }
    }
  }
}
