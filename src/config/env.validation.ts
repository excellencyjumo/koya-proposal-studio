export interface EnvironmentConfig {
  NODE_ENV: string;
  PORT: number;
  JWT_SECRET: string;
  ANTHROPIC_API_KEY: string;
  CLAUDE_MODEL: string;
  STORAGE_DRIVER: 'supabase' | 'local';
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SLACK_WEBHOOK_URL?: string;
  DEMO_MODE: boolean;
}

export function validateEnvironment(): EnvironmentConfig {
  const missing: string[] = [];

  const JWT_SECRET = process.env.JWT_SECRET?.trim();
  if (!JWT_SECRET) {
    missing.push('JWT_SECRET (Required for secure JWT session token generation)');
  }

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY?.trim();
  if (!ANTHROPIC_API_KEY) {
    missing.push('ANTHROPIC_API_KEY (Required for Anthropic Claude Haiku 4.5 proposal generation)');
  }

  const storageDriver = (process.env.STORAGE_DRIVER?.trim().toLowerCase() || 'local') as 'supabase' | 'local';

  if (storageDriver === 'supabase') {
    const supabaseUrl = process.env.SUPABASE_URL?.trim();
    const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY)?.trim();

    if (!supabaseUrl) {
      missing.push('SUPABASE_URL (Required when STORAGE_DRIVER=supabase)');
    }
    if (!supabaseKey) {
      missing.push('SUPABASE_SERVICE_ROLE_KEY (Required when STORAGE_DRIVER=supabase)');
    }
  }

  if (missing.length > 0) {
    const errorMsg = [
      '================================================================================',
      '[FATAL] BOOTSTRAP FAILED: Missing mandatory environment variables!',
      '================================================================================',
      ...missing.map(m => `  - ${m}`),
      '',
      'Please check your .env file or environment variables before starting.',
      'Refer to .env.example for required configuration format.',
      '================================================================================'
    ].join('\n');

    throw new Error(errorMsg);
  }

  return {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '3000', 10),
    JWT_SECRET: JWT_SECRET!,
    ANTHROPIC_API_KEY: ANTHROPIC_API_KEY!,
    CLAUDE_MODEL: process.env.CLAUDE_MODEL?.trim() || 'claude-haiku-4-5-20251001',
    STORAGE_DRIVER: storageDriver,
    SUPABASE_URL: process.env.SUPABASE_URL?.trim(),
    SUPABASE_SERVICE_ROLE_KEY: (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY)?.trim(),
    SLACK_WEBHOOK_URL: process.env.SLACK_WEBHOOK_URL?.trim(),
    DEMO_MODE: process.env.DEMO_MODE !== 'false'
  };
}
