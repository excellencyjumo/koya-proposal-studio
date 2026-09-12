import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SlackService {
  private readonly logger = new Logger(SlackService.name);

  private getBaseUrl(options: { host?: string; protocol?: string } = {}): string {
    if (options.host && !options.host.includes('localhost')) {
      return `${options.protocol || 'https'}://${options.host}`;
    }
    const envUrl = process.env.PUBLIC_APP_URL;
    if (envUrl && envUrl.startsWith('http')) {
      return envUrl.replace(/\/+$/, '');
    }
    return 'https://3f57-102-88-167-104.ngrok-free.app';
  }

  buildSlackPayload(proposal: any, options: { host?: string; protocol?: string; actor?: string } = {}) {
    const baseUrl = this.getBaseUrl(options);
    const reviewUrl = `${baseUrl}/proposals/${proposal.id}`;
    const clientUrl = `${baseUrl}/client-view.html?id=${proposal.id}`;

    const clientName = proposal.client_name || 'Client';
    const companyName = proposal.company_name || 'Organization';
    const salesperson = proposal.salesperson_name || 'Sarah Chen';
    const actor = options.actor || salesperson;

    const sections = proposal.sections || {};
    const scopePreview = (sections.project_scope || sections.introduction || 'Scope defined in 7-section document.')
      .replace(/\n+/g, ' ')
      .slice(0, 240) + '...';

    return {
      text: `Proposal Pending Approval: ${companyName} (${clientName})`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `Proposal Pending Manager Approval`,
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Client & Company:*\n${clientName} (${companyName})`
            },
            {
              type: 'mrkdwn',
              text: `*Submitted By:*\n${actor} (${proposal.created_by_user_id || 'usr_sales_01'})`
            },
            {
              type: 'mrkdwn',
              text: `*Proposal ID:*\n\`${proposal.id}\``
            },
            {
              type: 'mrkdwn',
              text: `*Status:*\nPending Manager Sign-off`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Executive Context & Scope:*\n>${scopePreview}`
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Review & Sign Off',
                emoji: true
              },
              style: 'primary',
              url: reviewUrl
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Client View',
                emoji: true
              },
              url: clientUrl
            }
          ]
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `*Governance Note:* Dual authorization protocol strictly enforced. Approver cannot be ${salesperson}.`
            }
          ]
        }
      ]
    };
  }

  buildApprovalPayload(proposal: any, approverName: string, notes?: string) {
    const baseUrl = this.getBaseUrl();
    const clientUrl = `${baseUrl}/client-view.html?id=${proposal.id}`;

    return {
      text: `Proposal Approved: ${proposal.company_name} (v${proposal.version})`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `Proposal Formally Approved`,
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Company:*\n${proposal.company_name}` },
            { type: 'mrkdwn', text: `*Approved By:*\n${approverName}` },
            { type: 'mrkdwn', text: `*Version:*\nv${proposal.version}` },
            { type: 'mrkdwn', text: `*Status:*\nUnlocked for Client Delivery` }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Manager Notes:*\n>${notes || 'All commercial milestones and deliverables verified.'}`
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Open Proposal Document',
                emoji: true
              },
              style: 'primary',
              url: clientUrl
            }
          ]
        }
      ]
    };
  }

  buildChangesRequestedPayload(proposal: any, managerName: string, notes?: string) {
    return {
      text: `Changes Requested: ${proposal.company_name}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `Revision Required for Proposal`,
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Company:*\n${proposal.company_name}` },
            { type: 'mrkdwn', text: `*Reviewed By:*\n${managerName}` },
            { type: 'mrkdwn', text: `*Action:*\nSales Rep Revision Needed` }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Feedback Guidance:*\n>${notes || 'Please adjust the timeline or deliverables before resubmission.'}`
          }
        }
      ]
    };
  }

  buildDeliveryPayload(proposal: any, clientEmail: string, actor: string) {
    const baseUrl = this.getBaseUrl();
    const clientUrl = `${baseUrl}/client-view.html?id=${proposal.id}`;

    return {
      text: `Proposal Delivered to ${clientEmail}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `Client Delivery Completed`,
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Recipient:*\n${clientEmail}` },
            { type: 'mrkdwn', text: `*Company:*\n${proposal.company_name}` },
            { type: 'mrkdwn', text: `*Delivered By:*\n${actor}` },
            { type: 'mrkdwn', text: `*Document State:*\nLocked & Immutable` }
          ]
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Open Client Proposal Sheet',
                emoji: true
              },
              style: 'primary',
              url: clientUrl
            }
          ]
        }
      ]
    };
  }

  buildSystemAlertPayload(errorType: string, message: string, details?: any) {
    return {
      text: `System Alert: ${errorType}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `System Warning / Diagnostic Alert`,
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Alert Type:*\n${errorType}` },
            { type: 'mrkdwn', text: `*Timestamp:*\n${new Date().toISOString()}` }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Details:*\n\`\`\`${message}\n${details ? JSON.stringify(details, null, 2) : ''}\`\`\``
          }
        }
      ]
    };
  }

  private async postToWebhook(payload: any, channel = '#proposals-approval', overrideWebhookUrl?: string) {
    const webhookUrl = (overrideWebhookUrl && overrideWebhookUrl.trim()) || process.env.SLACK_WEBHOOK_URL;
    const botToken = process.env.SLACK_BOT_TOKEN;

    // 1. If webhook URL is explicitly provided, dispatch to incoming webhook
    if (webhookUrl && !webhookUrl.includes('YOUR/WEBHOOK') && webhookUrl.trim() !== '') {
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorText = await response.text();
          return {
            dispatched: false,
            mode: 'failed',
            http_status: response.status,
            error: errorText,
            channel,
            retryable: response.status >= 500,
            payload
          };
        }

        return {
          dispatched: true,
          mode: 'live',
          http_status: response.status,
          channel,
          recipient: 'Sales Management',
          payload
        };
      } catch (err: any) {
        return {
          dispatched: false,
          mode: 'error',
          error: err.message,
          channel,
          retryable: true,
          payload
        };
      }
    }

    // 2. If Slack Bot Token is available, dispatch directly using Slack Web API (chat.postMessage)
    if (botToken && botToken.startsWith('xoxb-')) {
      try {
        const cleanChannel = channel ? channel.replace('#', '').trim() : '';
        const targetChannel = (cleanChannel && cleanChannel !== 'proposals-approval')
          ? cleanChannel
          : (process.env.SLACK_CHANNEL || 'general');

        const response = await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Authorization': `Bearer ${botToken}`
          },
          body: JSON.stringify({
            channel: targetChannel,
            text: payload.text || 'Proposal Notification',
            blocks: payload.blocks
          })
        });

        const data = await response.json();
        if (data.ok) {
          return {
            dispatched: true,
            mode: 'live',
            http_status: 200,
            channel: `#${targetChannel}`,
            recipient: 'Sales Management',
            payload
          };
        } else {
          return {
            dispatched: false,
            mode: 'failed',
            error: data.error,
            channel: `#${targetChannel}`,
            hint: data.error === 'not_in_channel'
              ? `The Slack Bot is not yet invited to #${targetChannel}. In Slack, type: /invite @koya_proposal_studio`
              : undefined,
            payload
          };
        }
      } catch (err: any) {
        return {
          dispatched: false,
          mode: 'error',
          error: err.message,
          channel,
          payload
        };
      }
    }

    // 3. Fallback: preview only
    return {
      dispatched: false,
      mode: 'preview_only',
      reason: 'SLACK_WEBHOOK_URL and SLACK_BOT_TOKEN are not configured. Block Kit payload generated for preview.',
      channel,
      recipient: 'Sales Management',
      payload
    };
  }

  async verifySlackAuth() {
    const botToken = process.env.SLACK_BOT_TOKEN;
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    const defaultChannel = process.env.SLACK_CHANNEL || 'general';

    if (!botToken || !botToken.startsWith('xoxb-')) {
      return {
        configured: Boolean(webhookUrl),
        mode: webhookUrl ? 'webhook' : 'none',
        default_channel: defaultChannel,
        has_webhook: Boolean(webhookUrl)
      };
    }

    try {
      const response = await fetch('https://slack.com/api/auth.test', {
        headers: { Authorization: `Bearer ${botToken}` }
      });
      const data = await response.json();
      return {
        configured: true,
        ok: data.ok,
        mode: 'bot_token',
        bot_user: data.user,
        bot_id: data.bot_id,
        team: data.team,
        team_url: data.url,
        team_id: data.team_id,
        default_channel: defaultChannel,
        has_webhook: Boolean(webhookUrl && !webhookUrl.includes('YOUR/WEBHOOK'))
      };
    } catch (err: any) {
      return {
        configured: true,
        ok: false,
        mode: 'bot_token',
        error: err.message,
        default_channel: defaultChannel
      };
    }
  }

  buildTestPingPayload(message?: string) {
    return {
      text: message || 'Koya Proposal Studio: Slack Integration Connected Successfully!',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: 'Proposal Studio Live Verification',
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: '*Service:*\nKoya Proposal Studio NestJS' },
            { type: 'mrkdwn', text: `*Timestamp:*\n${new Date().toISOString()}` },
            { type: 'mrkdwn', text: '*Integration:*\nSlack Web API & Block Kit' },
            { type: 'mrkdwn', text: '*Status:*\nActive & Authorized' }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: message ? `>${message}` : '>All proposal lifecycle alerts (Submissions, Approvals, Deliveries) are enabled.'
          }
        }
      ]
    };
  }

  async sendTestPing(options: { channel?: string; webhook_url?: string; message?: string } = {}) {
    const payload = this.buildTestPingPayload(options.message);
    return this.postToWebhook(payload, options.channel || '#general', options.webhook_url);
  }

  async dispatchSlackNotification(
    proposal: any,
    options: { host?: string; protocol?: string; actor?: string; webhook_url?: string; channel?: string } = {}
  ) {
    const payload = this.buildSlackPayload(proposal, options);
    return this.postToWebhook(payload, options.channel || '#proposals-approval', options.webhook_url);
  }

  async dispatchApprovalNotification(proposal: any, approverName: string, notes?: string) {
    const payload = this.buildApprovalPayload(proposal, approverName, notes);
    return this.postToWebhook(payload, '#proposals-approval');
  }

  async dispatchChangesRequestedNotification(proposal: any, managerName: string, notes?: string) {
    const payload = this.buildChangesRequestedPayload(proposal, managerName, notes);
    return this.postToWebhook(payload, '#proposals-approval');
  }

  async dispatchDeliveryNotification(proposal: any, clientEmail: string, actor: string) {
    const payload = this.buildDeliveryPayload(proposal, clientEmail, actor);
    return this.postToWebhook(payload, '#proposals-delivery');
  }

  async dispatchSystemErrorNotification(errorType: string, message: string, details?: any) {
    const payload = this.buildSystemAlertPayload(errorType, message, details);
    return this.postToWebhook(payload, '#system-alerts');
  }

  buildClientRevisionRequestedPayload(proposal: any, clientFeedback: string, requestedBy: string) {
    return {
      text: `Client Revision Requested: ${proposal.company_name} (Awaiting Manager Unlock)`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `⚠️ Client Feedback Received: Revision Unlock Requested`,
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Company:*\n${proposal.company_name}` },
            { type: 'mrkdwn', text: `*Requested By:*\n${requestedBy}` },
            { type: 'mrkdwn', text: `*Proposal ID:*\n\`${proposal.id}\`` },
            { type: 'mrkdwn', text: `*Current Status:*\nRevision Awaiting Approval` }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Customer Feedback & Revision Guidance:*\n>${clientFeedback}`
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `*Governance Protocol:* Manager authorization required to unlock document for sales rep revisions.`
            }
          ]
        }
      ]
    };
  }

  buildRevisionUnlockedPayload(proposal: any, managerName: string, notes?: string) {
    return {
      text: `Proposal Unlocked for Revisions: ${proposal.company_name} by ${managerName}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `🔓 Proposal Unlocked for Revision by Manager`,
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Company:*\n${proposal.company_name}` },
            { type: 'mrkdwn', text: `*Authorized Manager:*\n${managerName}` },
            { type: 'mrkdwn', text: `*State:*\nReverted to Draft for Editing` },
            { type: 'mrkdwn', text: `*Proposal ID:*\n\`${proposal.id}\`` }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Manager Guidance Notes:*\n>${notes || 'Sales rep authorized to update deliverables and pricing.'}`
          }
        }
      ]
    };
  }

  buildProposalWonPayload(proposal: any, signerName: string, signerTitle?: string) {
    const clientTitle = signerTitle || 'Authorized Executive';
    const baseUrl = this.getBaseUrl();
    const clientUrl = `${baseUrl}/client-view.html?id=${proposal.id}`;

    return {
      text: `🎉 Deal Won! Proposal Accepted: ${proposal.company_name} (${signerName})`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `🎉 Deal Won: Proposal Accepted & Digitally Signed!`,
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Company:*\n${proposal.company_name}` },
            { type: 'mrkdwn', text: `*Signer:*\n${signerName} (${clientTitle})` },
            { type: 'mrkdwn', text: `*Lead Sales Rep:*\n${proposal.salesperson_name}` },
            { type: 'mrkdwn', text: `*Proposal ID:*\n\`${proposal.id}\`` }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Status:* Proposal has transitioned to *Accepted & Executed*. Commercial terms and delivery schedule locked.`
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Digitally Signed Agreement',
                emoji: true
              },
              style: 'primary',
              url: clientUrl
            }
          ]
        }
      ]
    };
  }

  async dispatchClientRevisionRequestedNotification(proposal: any, clientFeedback: string, requestedBy: string) {
    const payload = this.buildClientRevisionRequestedPayload(proposal, clientFeedback, requestedBy);
    return this.postToWebhook(payload, '#proposals-approval');
  }

  async dispatchRevisionUnlockedNotification(proposal: any, managerName: string, notes?: string) {
    const payload = this.buildRevisionUnlockedPayload(proposal, managerName, notes);
    return this.postToWebhook(payload, '#proposals-approval');
  }

  async dispatchProposalWonNotification(proposal: any, signerName: string, signerTitle?: string) {
    const payload = this.buildProposalWonPayload(proposal, signerName, signerTitle);
    return this.postToWebhook(payload, '#proposals-won');
  }
}

