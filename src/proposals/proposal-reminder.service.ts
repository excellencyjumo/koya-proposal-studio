import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { StorageService } from '../db/storage.service';
import { SlackService } from '../slack/slack.service';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ProposalReminderService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(ProposalReminderService.name);
  private timer: NodeJS.Timeout | null = null;
  private healthTimer: NodeJS.Timeout | null = null;
  private lastReminderDispatch: Map<string, number> = new Map();

  constructor(
    private readonly storage: StorageService,
    private readonly slack: SlackService,
    private readonly supabase: SupabaseService
  ) {}

  onApplicationBootstrap() {
    this.logger.log('ProposalReminderService: Initializing background cron reminder scheduler (interval: 15m) and health watchdog (interval: 10m)');
    // Run initial scan after 8 seconds to allow boot completion
    setTimeout(() => {
      this.checkAndSendReminders().catch((err) => {
        this.logger.warn(`Initial reminder check failed: ${err.message}`);
      });
      this.checkSystemHealthWatchdog().catch((err) => {
        this.logger.warn(`Initial health watchdog check failed: ${err.message}`);
      });
    }, 8000);

    // Schedule regular reminder check every 15 minutes
    this.timer = setInterval(() => {
      this.checkAndSendReminders().catch((err) => {
        this.logger.warn(`Cron reminder check failed: ${err.message}`);
      });
    }, 15 * 60 * 1000);
    this.timer.unref();

    // Schedule regular system health watchdog check every 10 minutes
    this.healthTimer = setInterval(() => {
      this.checkSystemHealthWatchdog().catch((err) => {
        this.logger.warn(`Cron health watchdog check failed: ${err.message}`);
      });
    }, 10 * 60 * 1000);
    this.healthTimer.unref();
  }

  onApplicationShutdown() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.healthTimer) {
      clearInterval(this.healthTimer);
      this.healthTimer = null;
    }
  }

  async checkAndSendReminders(options: { force?: boolean } = {}) {
    const proposals = this.storage.getProposals();
    const now = Date.now();
    const results: Array<{ id: string; type: string; dispatched: boolean; details?: any }> = [];

    for (const proposal of proposals) {
      const id = proposal.id;
      const status = proposal.status;

      // 1. Review Deadline Reminders: Proposals pending manager review
      if (status === 'pending_approval') {
        const cacheKey = `review_reminder:${id}`;
        const lastSent = this.lastReminderDispatch.get(cacheKey) || 0;
        const cooldown = options.force ? 0 : 4 * 60 * 60 * 1000; // 4-hour cooldown

        if (now - lastSent >= cooldown) {
          const submittedAt = new Date(proposal.updated_at || proposal.created_at || now).getTime();
          const hoursPending = Math.max(1, Math.round((now - submittedAt) / (60 * 60 * 1000)));

          const payload = {
            text: `⏰ SLA Reminder: Proposal Pending Manager Review — ${proposal.company_name}`,
            blocks: [
              {
                type: 'header',
                text: {
                  type: 'plain_text',
                  text: '⏰ Review SLA Reminder: Manager Sign-off Pending',
                  emoji: true
                }
              },
              {
                type: 'section',
                fields: [
                  { type: 'mrkdwn', text: `*Company:*\n${proposal.company_name}` },
                  { type: 'mrkdwn', text: `*Contact:*\n${proposal.client_name}` },
                  { type: 'mrkdwn', text: `*Salesperson:*\n${proposal.salesperson_name}` },
                  { type: 'mrkdwn', text: `*Awaiting Review:*\n~${hoursPending}h pending` }
                ]
              },
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `>This proposal is awaiting sales management approval before client delivery can proceed.`
                }
              },
              {
                type: 'actions',
                elements: [
                  {
                    type: 'button',
                    text: { type: 'plain_text', text: 'Review & Sign Off', emoji: true },
                    style: 'primary',
                    url: `http://localhost:3000/proposals/${proposal.id}`
                  }
                ]
              }
            ]
          };

          const dispatchResult = await (this.slack as any).postToWebhook(payload, '#general');
          this.lastReminderDispatch.set(cacheKey, now);

          const log = this.storage.addAuditLog(
            id,
            'cron_review_reminder_dispatched',
            'System Scheduler',
            { hours_pending: hoursPending, dispatched: dispatchResult.dispatched }
          );
          this.supabase.syncAuditLog(log);

          results.push({ id, type: 'review_reminder', dispatched: Boolean(dispatchResult.dispatched) });
        }
      }

      // 2. Client Delivery Reminders: Approved proposals waiting to be sent to customers
      if (status === 'approved') {
        const cacheKey = `delivery_reminder:${id}`;
        const lastSent = this.lastReminderDispatch.get(cacheKey) || 0;
        const cooldown = options.force ? 0 : 4 * 60 * 60 * 1000;

        if (now - lastSent >= cooldown) {
          const approvedAt = new Date(proposal.approval?.approved_at || proposal.updated_at || now).getTime();
          const hoursApproved = Math.max(1, Math.round((now - approvedAt) / (60 * 60 * 1000)));

          const payload = {
            text: `⏰ SLA Reminder: Approved Proposal Ready for Client Delivery — ${proposal.company_name}`,
            blocks: [
              {
                type: 'header',
                text: {
                  type: 'plain_text',
                  text: '🚀 Client Delivery Deadline Reminder',
                  emoji: true
                }
              },
              {
                type: 'section',
                fields: [
                  { type: 'mrkdwn', text: `*Company:*\n${proposal.company_name}` },
                  { type: 'mrkdwn', text: `*Client Email:*\n${proposal.client_email}` },
                  { type: 'mrkdwn', text: `*Approved By:*\n${proposal.approval?.approved_by || 'Management'}` },
                  { type: 'mrkdwn', text: `*Status:*\nApproved (~${hoursApproved}h ago)` }
                ]
              },
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `>Proposal has been signed off by management and is awaiting formal delivery to customer.`
                }
              },
              {
                type: 'actions',
                elements: [
                  {
                    type: 'button',
                    text: { type: 'plain_text', text: 'Open Proposal Studio', emoji: true },
                    style: 'primary',
                    url: `http://localhost:3000/proposals/${proposal.id}`
                  }
                ]
              }
            ]
          };

          const dispatchResult = await (this.slack as any).postToWebhook(payload, '#general');
          this.lastReminderDispatch.set(cacheKey, now);

          const log = this.storage.addAuditLog(
            id,
            'cron_delivery_reminder_dispatched',
            'System Scheduler',
            { hours_approved: hoursApproved, dispatched: dispatchResult.dispatched }
          );
          this.supabase.syncAuditLog(log);

          results.push({ id, type: 'delivery_reminder', dispatched: Boolean(dispatchResult.dispatched) });
        }
      }

      // 3. Validity Expiry Reminders: Proposals expiring in <= 5 days
      if (proposal.valid_until && (status === 'approved' || status === 'delivered')) {
        const validUntil = new Date(proposal.valid_until).getTime();
        const daysRemaining = Math.ceil((validUntil - now) / (24 * 60 * 60 * 1000));

        if (daysRemaining <= 5 && daysRemaining >= 0) {
          const cacheKey = `validity_reminder:${id}`;
          const lastSent = this.lastReminderDispatch.get(cacheKey) || 0;
          const cooldown = options.force ? 0 : 12 * 60 * 60 * 1000; // 12h cooldown

          if (now - lastSent >= cooldown) {
            const payload = {
              text: `⚠️ Validity Alert: Proposal for ${proposal.company_name} expires in ${daysRemaining} days`,
              blocks: [
                {
                  type: 'header',
                  text: {
                    type: 'plain_text',
                    text: '⚠️ Quote Validity Expiry Alert',
                    emoji: true
                  }
                },
                {
                  type: 'section',
                  fields: [
                    { type: 'mrkdwn', text: `*Company:*\n${proposal.company_name}` },
                    { type: 'mrkdwn', text: `*Recipient:*\n${proposal.client_name}` },
                    { type: 'mrkdwn', text: `*Expires:*\n${proposal.valid_until}` },
                    { type: 'mrkdwn', text: `*Days Left:*\n${daysRemaining} days remaining` }
                  ]
                }
              ]
            };

            const dispatchResult = await (this.slack as any).postToWebhook(payload, '#general');
            this.lastReminderDispatch.set(cacheKey, now);

            const log = this.storage.addAuditLog(
              id,
              'cron_validity_reminder_dispatched',
              'System Scheduler',
              { days_remaining: daysRemaining, dispatched: dispatchResult.dispatched }
            );
            this.supabase.syncAuditLog(log);

            results.push({ id, type: 'validity_reminder', dispatched: Boolean(dispatchResult.dispatched) });
          }
        }
      }
    }

    return {
      success: true,
      checked_proposals_count: proposals.length,
      reminders_dispatched: results.length,
      results
    };
  }

  async checkSystemHealthWatchdog() {
    try {
      const supabaseHealth = await this.supabase.checkStatus();
      const canWriteDb = this.storage.canWrite();
      const memUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memUsage.heapUsed / (1024 * 1024));

      const issues: string[] = [];
      if (!canWriteDb) issues.push('Local storage is not writable');
      if (heapUsedMB > 700) issues.push(`High memory heap usage: ${heapUsedMB}MB`);

      if (issues.length > 0) {
        this.logger.error(`System Health Watchdog detected degradation: ${issues.join(', ')}`);
        await this.slack.dispatchSystemErrorNotification(
          'HEALTH_WATCHDOG_DEGRADATION',
          `Automated health watchdog detected degradation: ${issues.join('; ')}`,
          { issues, heapUsedMB, supabaseHealth }
        );
        return { healthy: false, issues, timestamp: new Date().toISOString() };
      }

      this.logger.log(`System Health Watchdog: All services operational (heap: ${heapUsedMB}MB, db: writable, supabase: ${supabaseHealth.connected ? 'connected' : 'disabled'})`);
      return { healthy: true, heapUsedMB, supabase: supabaseHealth, timestamp: new Date().toISOString() };
    } catch (err: any) {
      this.logger.error(`System Health Watchdog probe failed: ${err.message}`);
      await this.slack.dispatchSystemErrorNotification(
        'HEALTH_WATCHDOG_PROBE_ERROR',
        `Automated health watchdog probe error: ${err.message}`,
        { error: err.message, timestamp: new Date().toISOString() }
      );
      return { healthy: false, error: err.message, timestamp: new Date().toISOString() };
    }
  }

  getStatus() {
    return {
      active: Boolean(this.timer),
      interval_minutes: 15,
      health_watchdog_active: Boolean(this.healthTimer),
      health_interval_minutes: 10,
      cached_dispatch_count: this.lastReminderDispatch.size
    };
  }
}
