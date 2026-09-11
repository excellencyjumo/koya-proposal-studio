/**
 * Standalone System Health Watchdog Cron Script
 * 
 * Runs independently (via crontab, Windows Task Scheduler, or synthetic pingers).
 * Probes the NestJS /healthz endpoint, verifies database writability, memory, and services.
 * Dispatches an automated Slack alert if the system is unreachable or degraded.
 * 
 * Usage:
 *   node scripts/system_health_watchdog.js [--target=http://localhost:3000]
 */

const http = require('http');
const https = require('https');
require('dotenv').config();

const targetUrl = process.argv.find(a => a.startsWith('--target='))?.split('=')[1] 
  || process.env.PUBLIC_APP_URL 
  || 'http://localhost:3000';

const healthEndpoint = `${targetUrl.replace(/\/$/, '')}/healthz`;
const webhookUrl = process.env.SLACK_WEBHOOK_URL;

async function sendSlackAlert(title, message, details) {
  if (!webhookUrl) {
    console.warn('[WATCHDOG] No SLACK_WEBHOOK_URL configured, skipping Slack dispatch.');
    return;
  }

  const payload = {
    text: `🚨 Independent Health Watchdog Alert: ${title}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🚨 Independent System Health Watchdog Alert',
          emoji: true
        }
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Endpoint:*\n\`${healthEndpoint}\`` },
          { type: 'mrkdwn', text: '*Status:*\n*DOWN / DEGRADED*' },
          { type: 'mrkdwn', text: `*Timestamp:*\n${new Date().toISOString()}` },
          { type: 'mrkdwn', text: '*Trigger:*\nIndependent Watchdog Cron' }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Diagnostic Details:*\n\`\`\`${message}\n${details ? JSON.stringify(details, null, 2) : ''}\`\`\``
        }
      }
    ]
  };

  try {
    const urlObj = new URL(webhookUrl);
    const bodyStr = JSON.stringify(payload);
    const req = https.request(urlObj, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr)
      }
    });
    req.on('error', (err) => console.error('[WATCHDOG] Slack dispatch error:', err.message));
    req.write(bodyStr);
    req.end();
  } catch (err) {
    console.error('[WATCHDOG] Failed to dispatch Slack alert:', err.message);
  }
}

function probeEndpoint(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === 'https:' ? https : http;
    const req = client.get(url, { timeout: 8000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, body: json });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Health probe timed out after 8000ms'));
    });
  });
}

async function runWatchdog() {
  console.log(`[WATCHDOG CRON] Probing system health at ${healthEndpoint}...`);
  try {
    const res = await probeEndpoint(healthEndpoint);
    if (res.status === 200 && res.body?.status === 'ok') {
      console.log(`[WATCHDOG CRON] ✅ System Healthy: HTTP ${res.status}, Uptime: ${res.body?.checks?.uptime_seconds}s, DB Writable: ${res.body?.checks?.db_writable}`);
      process.exit(0);
    } else {
      console.error(`[WATCHDOG CRON] ⚠️ System Degraded: HTTP ${res.status}`, res.body);
      await sendSlackAlert('SYSTEM_DEGRADED', `Endpoint returned status ${res.status}`, res.body);
      process.exit(1);
    }
  } catch (err) {
    console.error(`[WATCHDOG CRON] ❌ System Unreachable: ${err.message}`);
    await sendSlackAlert('SYSTEM_UNREACHABLE', `Health probe failed: ${err.message}`);
    process.exit(1);
  }
}

runWatchdog();