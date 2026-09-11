import {
  Injectable,
  BadRequestException,
  PayloadTooLargeException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger
} from '@nestjs/common';
import * as crypto from 'crypto';
import { StorageService, Proposal } from '../db/storage.service';
import { ClaudeService } from '../claude/claude.service';
import { SlackService } from '../slack/slack.service';
import { SupabaseService } from '../supabase/supabase.service';
import { RedisService } from '../redis/redis.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class ProposalService {
  private readonly logger = new Logger(ProposalService.name);

  constructor(
    private readonly storage: StorageService,
    private readonly claude: ClaudeService,
    private readonly slack: SlackService,
    private readonly supabase: SupabaseService,
    private readonly redis: RedisService,
    private readonly emailService: EmailService
  ) {}

  private async invalidateCache(id?: string) {
    try {
      if (id) await this.redis.del(`cache:proposal:${id}`);
      await this.redis.del('cache:proposals:all');
    } catch {
      // ignore
    }
  }


  async generateProposal(
    intakeData: Record<string, any>,
    supportingMaterial = '',
    idempotencyHeaderKey: string | null = null,
    user: any = null,
    injectFault?: string
  ) {
    if (!intakeData) {
      throw new BadRequestException('Missing required field: intake_data');
    }

    if (supportingMaterial && supportingMaterial.length > 50000) {
      throw new PayloadTooLargeException(
        'Supporting material exceeds maximum allowed length of 50,000 characters.'
      );
    }

    // Idempotency check: sha256 of intakeData or header key
    const idempotencyKey =
      idempotencyHeaderKey ||
      crypto.createHash('sha256').update(JSON.stringify(intakeData)).digest('hex');

    const existing = this.storage.findByIdempotencyKey(idempotencyKey);
    if (existing) {
      return {
        success: true,
        idempotent_replay: true,
        message: 'Returning existing cached proposal for identical intake within TTL window.',
        proposal: existing
      };
    }

    const generated = await this.claude.generateProposal(intakeData, supportingMaterial, {
      injectFault
    });

    const proposal = this.storage.createProposal({
      idempotency_key: idempotencyKey,
      client_name: intakeData.client_name,
      client_email: intakeData.client_email,
      company_name: intakeData.company_name,
      salesperson_name: intakeData.salesperson_name || user?.name || 'Sarah Chen',
      created_by_user_id: user?.id || 'usr_sales_01',
      date_of_call: intakeData.date_of_call,
      title: generated.title || `Proposal for ${intakeData.company_name || 'Client'}`,
      intake_data: intakeData,
      supporting_material: supportingMaterial || '',
      has_gaps: generated.has_gaps,
      gaps: generated.gaps || [],
      sections: generated.sections || {},
      telemetry: generated.telemetry
    });

    this.validatePricingConsistency(proposal, intakeData);

    // Cloud sync
    this.supabase.syncProposal(proposal);
    this.invalidateCache(proposal.id);

    return {

      success: true,
      proposal,
      gap_analysis: {
        has_gaps: proposal.has_gaps,
        gaps: proposal.gaps || []
      }
    };
  }

  validatePricingConsistency(proposal: Proposal, intake: Record<string, any>): void {
    const intakePricing = String(intake?.estimated_pricing || '').trim();
    const sectionPricing = String(proposal.sections?.pricing || '').trim();

    const isIntakeUnset =
      !intakePricing ||
      ['tbd', 'to be decided', 'n/a', 'unknown', 'pending', 'flexible'].includes(
        intakePricing.toLowerCase()
      );

    if (isIntakeUnset) {
      if (!sectionPricing.includes('[TO BE CONFIRMED]')) {
        const issue =
          'Pricing was not specified in intake, but the pricing section lacks the required [TO BE CONFIRMED] placeholder.';
        proposal.has_gaps = true;
        proposal.gaps = proposal.gaps || [];
        proposal.gaps.push({
          field: 'pricing_consistency',
          severity: 'high',
          issue,
          recommendation: 'Ensure [TO BE CONFIRMED] is added to pricing section pending discovery.'
        });
        this.storage.addAuditLog(proposal.id, 'pricing_consistency_warning', 'System Validator', {
          issue,
          severity: 'high'
        });
        this.slack
          .dispatchSystemErrorNotification('PRICING_CONSISTENCY_WARNING', issue, {
            proposal_id: proposal.id,
            company: proposal.company_name,
            severity: 'high'
          })
          .catch(() => {});
      }
      return;
    }

    // Extract currency figures or numbers from intake
    const intakeNumbers = intakePricing.match(/\$?\d[\d,]*(?:\.\d+)?/g) || [];
    if (intakeNumbers.length > 0) {
      const hasMatch = intakeNumbers.some(
        (num) =>
          sectionPricing.includes(num.replace(/,/g, '')) || sectionPricing.includes(num)
      );
      const hasConfirmation = sectionPricing.includes('[TO BE CONFIRMED]');

      if (!hasMatch && !hasConfirmation) {
        const issue = `Commercial mismatch: Intake specified "${intakePricing}", but generated pricing section does not reflect these figures.`;
        proposal.has_gaps = true;
        proposal.gaps = proposal.gaps || [];
        proposal.gaps.push({
          field: 'pricing_consistency',
          severity: 'high',
          issue,
          recommendation:
            'Review generated pricing against intake contract values before manager sign-off.'
        });
        this.storage.addAuditLog(proposal.id, 'pricing_consistency_warning', 'System Validator', {
          issue,
          intake_pricing: intakePricing,
          severity: 'high'
        });
        this.slack
          .dispatchSystemErrorNotification('COMMERCIAL_PRICING_MISMATCH', issue, {
            proposal_id: proposal.id,
            company: proposal.company_name,
            intake_pricing: intakePricing,
            severity: 'high'
          })
          .catch(() => {});
      }
    }
  }

  async getProposals(): Promise<Proposal[]> {
    const cached = await this.redis.get<Proposal[]>('cache:proposals:all');
    if (cached) return cached;
    const proposals = this.storage.getProposals();
    await this.redis.set('cache:proposals:all', proposals, 60);
    return proposals;
  }

  async getProposalById(id: string) {
    const cached = await this.redis.get<Proposal>(`cache:proposal:${id}`);
    const proposal = cached || this.storage.getProposalById(id);
    if (!proposal) {
      throw new NotFoundException(`Proposal ${id} not found`);
    }
    if (!cached) {
      await this.redis.set(`cache:proposal:${id}`, proposal, 3600);
    }
    const auditLogs = this.storage.getAuditLogs(id);
    return {
      success: true,
      proposal,
      audit_logs: auditLogs
    };
  }


  updateSection(
    id: string,
    sectionKey: string,
    content: string,
    actor: string,
    actorUser?: any
  ) {
    if (!sectionKey || content === undefined) {
      throw new BadRequestException('Missing section_key or content');
    }

    const existing = this.storage.getProposalById(id);
    if (!existing) {
      throw new NotFoundException(`Proposal ${id} not found`);
    }

    if (existing.status === 'delivered' || existing.delivery?.is_delivered) {
      throw new ConflictException(
        `Proposal ${id} has already been delivered to ${existing.delivery?.client_email || existing.client_email} and is legally locked against modifications.`
      );
    }

    const updated = this.storage.updateSection(
      id,
      sectionKey,
      content,
      actor,
      undefined,
      actorUser
    );
    if (!updated) {
      throw new NotFoundException(`Proposal ${id} not found`);
    }

    this.supabase.syncProposal(updated);
    this.invalidateCache(id);
    return { success: true, proposal: updated };
  }


  async regenerateSection(
    id: string,
    sectionKey: string,
    instruction: string,
    actor: string,
    injectFault?: string,
    actorUser?: any
  ) {
    if (!sectionKey) {
      throw new BadRequestException('Missing section_key to regenerate');
    }

    const proposal = this.storage.getProposalById(id);
    if (!proposal) {
      throw new NotFoundException(`Proposal ${id} not found`);
    }

    if (proposal.status === 'delivered' || proposal.delivery?.is_delivered) {
      throw new ConflictException(
        `Proposal ${id} has already been delivered to ${proposal.delivery?.client_email || proposal.client_email} and is legally locked against modifications.`
      );
    }

    try {
      const regenResult = await this.claude.regenerateSection(
        proposal,
        sectionKey,
        instruction,
        { injectFault }
      );

      const updated = this.storage.updateSection(
        id,
        sectionKey,
        regenResult.revised_content,
        actor,
        regenResult.telemetry,
        actorUser
      );

      const log = this.storage.addAuditLog(id, 'section_regenerated', actor, {
        section: sectionKey,
        instruction: instruction || 'Regenerate section',
        version: updated.version,
        estimated_cost_usd: regenResult.telemetry?.estimated_cost_usd || 0
      });

      this.supabase.syncProposal(updated);
      this.supabase.syncAuditLog(log);
      this.invalidateCache(id);

      return {

        success: true,
        section_key: sectionKey,
        revised_content: regenResult.revised_content,
        telemetry: regenResult.telemetry,
        proposal: updated
      };
    } catch (err: any) {
      const isTimeout =
        err.code === 'ETIMEDOUT' || err.status === 504 || err.message?.includes('timeout');

      this.storage.addAuditLog(id, 'error', 'Claude Section Regen', {
        error: err.message,
        code: err.code || (isTimeout ? 'ETIMEDOUT' : 'SECTION_REGEN_ERROR')
      });

      throw err;
    }
  }

  async submitForApproval(
    id: string,
    actor: string,
    reqInfo: { host?: string; protocol?: string } = {}
  ) {
    const proposal = this.storage.getProposalById(id);
    if (!proposal) {
      throw new NotFoundException(`Proposal ${id} not found`);
    }

    const updated = this.storage.updateProposal(
      id,
      {
        status: 'pending_approval',
        approval: {
          ...proposal.approval,
          status: 'pending',
          requested_at: new Date().toISOString()
        }
      },
      actor
    );

    const slackResult = await this.slack.dispatchSlackNotification(updated, {
      host: reqInfo.host,
      protocol: reqInfo.protocol,
      actor
    });

    const submitLog = this.storage.addAuditLog(id, 'approval_requested', actor, {
      message: 'Proposal submitted for internal manager review.'
    });

    let slackLog: any;
    if (slackResult.dispatched) {
      slackLog = this.storage.addAuditLog(
        id,
        'slack_notification_dispatched',
        'Koya Slack Dispatcher',
        {
          channel: slackResult.channel,
          mode: slackResult.mode,
          status: slackResult.http_status,
          recipient: '#proposals-approval'
        }
      );
    } else if (slackResult.mode === 'preview_only') {
      slackLog = this.storage.addAuditLog(
        id,
        'slack_preview_rendered',
        'Koya Slack Dispatcher',
        {
          channel: slackResult.channel,
          mode: 'preview_only',
          reason: slackResult.reason
        }
      );
    } else {
      slackLog = this.storage.addAuditLog(id, 'slack_dispatch_failed', 'Koya Slack Dispatcher', {
        channel: slackResult.channel,
        error: slackResult.error,
        retryable: slackResult.retryable
      });
    }

    this.supabase.syncProposal(updated);
    this.supabase.syncAuditLog(submitLog);
    if (slackLog) this.supabase.syncAuditLog(slackLog);
    this.invalidateCache(id);

    return {

      success: true,
      proposal: updated,
      slack_dispatch: slackResult
    };
  }

  async testSlack(id: string, actor: string, reqInfo: { host?: string; protocol?: string; webhook_url?: string; channel?: string } = {}) {
    const proposal = this.storage.getProposalById(id);
    if (!proposal) {
      throw new NotFoundException(`Proposal ${id} not found`);
    }

    const slackResult = await this.slack.dispatchSlackNotification(proposal, {
      host: reqInfo.host,
      protocol: reqInfo.protocol,
      actor,
      webhook_url: reqInfo.webhook_url,
      channel: reqInfo.channel
    });

    const log = this.storage.addAuditLog(
      id,
      slackResult.dispatched ? 'slack_notification_dispatched' : 'slack_preview_rendered',
      'Test Harness',
      {
        channel: slackResult.channel,
        mode: slackResult.mode,
        status: slackResult.http_status,
        reason: slackResult.reason
      }
    );

    this.supabase.syncAuditLog(log);

    return {
      success: true,
      slack_dispatch: slackResult
    };
  }

  async approveProposal(id: string, approver: any, feedbackNotes?: string) {
    const proposal = this.storage.getProposalById(id);
    if (!proposal) {
      throw new NotFoundException(`Proposal ${id} not found`);
    }

    const approverName = approver?.name || 'Marcus Vance';
    const approverId = approver?.id;

    // --- FOUR-EYES PRINCIPLE GOVERNANCE CHECK ---
    // Strict ID-based comparison only: approver.id === proposal.created_by_user_id
    const isCreator = Boolean(
      approverId &&
      proposal.created_by_user_id &&
      approverId === proposal.created_by_user_id
    );

    if (isCreator) {
      this.storage.addAuditLog(id, 'authz_denied', approverName, {
        reason: 'Four-Eyes Principle violation: A salesperson cannot approve their own proposal.',
        creator_id: proposal.created_by_user_id,
        approver_id: approverId
      });

      throw new ForbiddenException({
        success: false,
        error: 'Four-Eyes Principle Violation',
        message:
          'Governance violation: You cannot sign off on a proposal you created. An independent Sales Manager must review and approve.',
        code: 'FOUR_EYES_VIOLATION',
        creator_user_id: proposal.created_by_user_id,
        attempted_by_user_id: approverId
      });
    }

    // --- DUAL-MANAGER INDEPENDENT APPROVAL GATE ---
    // If a manager edited the proposal, that manager CANNOT approve their own edits!
    // An independent secondary manager must review and approve.
    const isEditor = Boolean(
      approverId &&
      proposal.last_edited_by_user_id &&
      approverId === proposal.last_edited_by_user_id &&
      proposal.last_edited_by_role === 'manager'
    );

    if (isEditor) {
      this.storage.addAuditLog(id, 'authz_denied', approverName, {
        reason: 'Dual-Manager Governance violation: A manager cannot approve modifications they made.',
        last_edited_by: proposal.last_edited_by_user_id,
        approver_id: approverId
      });

      throw new ForbiddenException({
        success: false,
        error: 'Independent Manager Approval Required',
        message:
          'Dual-Manager Governance violation: You modified this proposal. An independent secondary manager must review and approve your edits before delivery to the customer.',
        code: 'INDEPENDENT_MANAGER_APPROVAL_REQUIRED',
        last_edited_by_user_id: proposal.last_edited_by_user_id,
        attempted_by_user_id: approverId
      });
    }

    // Tamper Guard: Verify digest
    const expectedDigest = this.storage.computeContentHash(proposal.sections);
    if (proposal.content_digest && proposal.content_digest !== expectedDigest) {
      this.logger.warn(`Tamper Guard warning on proposal ${id}: digest mismatch`);
    }

    const now = new Date().toISOString();
    const updated = this.storage.updateProposal(
      id,
      {
        status: 'approved',
        approval: {
          status: 'approved',
          approved_by: approverName,
          approved_at: now,
          feedback_notes: feedbackNotes || 'Approved for client delivery by management.'
        }
      },
      approverName
    );

    const log = this.storage.addAuditLog(id, 'approved', approverName, {
      message: 'Proposal approved for client transmission by verified sales manager.',
      feedback: feedbackNotes || 'All commercial terms and milestones validated.'
    });

    this.supabase.syncProposal(updated);
    this.supabase.syncAuditLog(log);
    this.invalidateCache(id);

    // Push Notification: Manager Approval to Slack
    this.slack.dispatchApprovalNotification(updated, approverName, feedbackNotes);

    // Automated Email Dispatch to Sales Rep with CC to Approving Manager & Admin
    const salesEmail = (updated.salesperson_name === 'Sarah Chen' ? 'sarah.chen@koyatalent.com' : 'sarah.chen@koyatalent.com');
    const managerEmail = approver?.email || (approverName === 'Marcus Vance' ? 'marcus.vance@koyatalent.com' : 'elena.rostova@koyatalent.com');
    const clientLink = `http://localhost:3000/proposals/${updated.id}`;

    const approvalEmailResult = await this.emailService.sendApprovalEmail({
      proposal: updated,
      salesEmail,
      salesName: updated.salesperson_name || 'Sales Representative',
      managerEmail,
      managerName: approverName,
      clientPortalUrl: clientLink,
      feedbackNotes,
      ccList: ['excellencejumo@gmail.com']
    });

    const emailLog = this.storage.addAuditLog(id, 'approval_email_dispatched', 'System Mailer', {
      to: salesEmail,
      cc: [managerEmail, 'excellencejumo@gmail.com'],
      result: approvalEmailResult
    });
    this.supabase.syncAuditLog(emailLog);

    return {
      success: true,
      proposal: updated,
      approved_by: approverName,
      approved_at: now,
      approval_email: approvalEmailResult
    };
  }

  requestChanges(id: string, reviewer: any, feedbackNotes?: string) {
    const proposal = this.storage.getProposalById(id);
    if (!proposal) {
      throw new NotFoundException(`Proposal ${id} not found`);
    }

    const reviewerName = reviewer?.name || 'Marcus Vance';

    const updated = this.storage.updateProposal(
      id,
      {
        status: 'changes_requested',
        approval: {
          ...proposal.approval,
          status: 'rejected',
          feedback_notes: feedbackNotes || 'Changes requested before approval.'
        }
      },
      reviewerName
    );

    const log = this.storage.addAuditLog(id, 'changes_requested', reviewerName, {
      feedback: feedbackNotes || 'Please adjust pricing or timeline.'
    });

    this.supabase.syncProposal(updated);
    this.supabase.syncAuditLog(log);
    this.invalidateCache(id);

    // Push Notification: Changes Requested
    this.slack.dispatchChangesRequestedNotification(updated, reviewerName, feedbackNotes);

    return { success: true, proposal: updated };

  }

  async deliverProposal(
    id: string,
    actorUser: any,
    clientEmail: string,
    reqInfo: { host?: string; protocol?: string } = {}
  ) {
    const proposal = this.storage.getProposalById(id);
    if (!proposal) {
      throw new NotFoundException(`Proposal ${id} not found`);
    }

    const actor = actorUser?.name || 'Sales Representative';

    // --- HARD APPROVAL GATE (Scenario 5) ---
    if (proposal.status !== 'approved' && proposal.approval?.status !== 'approved') {
      this.storage.addAuditLog(id, 'delivery_blocked', actor, {
        reason:
          'Approval Violation: Proposal cannot be sent to client before internal approval.',
        current_status: proposal.status,
        attempted_by: actor
      });

      throw new ForbiddenException({
        error: 'Approval Violation',
        message:
          'This proposal CANNOT be delivered to the client until it has been formally approved by internal management.',
        current_status: proposal.status,
        approval_state: proposal.approval?.status
      });
    }

    const clientLink = `${reqInfo.protocol || 'http'}://${reqInfo.host || 'localhost:3000'}/client-view.html?id=${proposal.id}`;
    const formattedEmail = this.claude.formatClientEmail(proposal, clientLink);

    const now = new Date().toISOString();
    const targetEmail = clientEmail || proposal.client_email;

    const updated = this.storage.updateProposal(
      id,
      {
        status: 'delivered',
        delivery: {
          is_delivered: true,
          delivered_at: now,
          client_email: targetEmail,
          email_subject: formattedEmail.subject,
          email_body: formattedEmail.body,
          delivery_status: 'sent'
        }
      },
      actor
    );

    const log = this.storage.addAuditLog(id, 'delivered', actor, {
      recipient: targetEmail,
      subject: formattedEmail.subject,
      proposal_link: clientLink
    });

    this.supabase.syncProposal(updated);
    this.supabase.syncAuditLog(log);
    this.invalidateCache(id);

    // Push Notification: Proposal Delivered to Slack
    this.slack.dispatchDeliveryNotification(updated, targetEmail, actor);

    // Live Email Dispatch
    const emailResult = await this.emailService.sendProposalEmail({
      to: targetEmail,
      proposal: updated,
      clientPortalUrl: clientLink,
      subject: formattedEmail.subject,
      body: formattedEmail.body
    });

    return {
      success: true,
      message: 'Proposal successfully delivered to client.',
      proposal: updated,
      delivery_details: {
        recipient: targetEmail,
        subject: formattedEmail.subject,
        body: formattedEmail.body,
        public_url: clientLink,
        sent_at: now,
        email_dispatch: emailResult
      }
    };
  }

  async testDirectEmail(toEmail: string) {
    return this.emailService.sendDirectTestEmail(toEmail);
  }

  async sendProposalEmailDirect(id: string, targetEmail: string, actor = 'Sales Rep', reqInfo: any = {}) {
    const proposal = this.storage.getProposalById(id);
    if (!proposal) {
      throw new NotFoundException(`Proposal ${id} not found`);
    }
    const clientLink = `${reqInfo.protocol || 'http'}://${reqInfo.host || 'localhost:3000'}/client-view.html?id=${proposal.id}`;
    const result = await this.emailService.sendProposalEmail({
      to: targetEmail || proposal.client_email,
      proposal,
      clientPortalUrl: clientLink
    });

    const log = this.storage.addAuditLog(id, 'email_dispatched', actor, {
      recipient: targetEmail || proposal.client_email,
      result
    });
    this.supabase.syncAuditLog(log);
    return result;
  }

  async requestClientRevision(id: string, feedback: string, actor = 'Sarah Chen') {
    const proposal = this.storage.getProposalById(id);
    if (!proposal) {
      throw new NotFoundException(`Proposal ${id} not found`);
    }

    const updated = this.storage.updateProposal(
      id,
      {
        status: 'revision_requested',
        revision_request_notes: feedback
      },
      actor
    );

    const log = this.storage.addAuditLog(id, 'client_revision_requested', actor, {
      feedback,
      previous_status: proposal.status,
      requested_at: new Date().toISOString()
    });

    this.supabase.syncProposal(updated);
    this.supabase.syncAuditLog(log);
    this.invalidateCache(id);

    // Slack alert for management
    this.slack
      .dispatchClientRevisionRequestedNotification(updated, feedback, actor)
      .catch(() => {});

    return {
      success: true,
      message: 'Client revision request submitted. Awaiting manager authorization to unlock editing.',
      proposal: updated,
      feedback
    };
  }

  async approveRevisionUnlock(id: string, notes: string, managerUser: any) {
    const proposal = this.storage.getProposalById(id);
    if (!proposal) {
      throw new NotFoundException(`Proposal ${id} not found`);
    }

    const managerRole = managerUser?.role || 'sales';
    if (managerRole !== 'manager') {
      throw new ForbiddenException({
        error: 'RBAC Access Denied',
        message: 'Only a sales manager can authorize unlocking a proposal for client revisions.',
        required_role: 'manager',
        current_role: managerRole
      });
    }

    const managerName = managerUser?.name || 'Marcus Vance';

    // Unlocking sets status back to draft, revokes existing approval, and increments minor version history
    const updated = this.storage.updateProposal(
      id,
      {
        status: 'draft',
        approval: {
          status: 'draft',
          feedback_notes: `Unlocked by ${managerName} for client revisions: ${notes || 'Revision authorized'}`
        }
      },
      managerName
    );

    const log = this.storage.addAuditLog(id, 'revision_unlocked_by_manager', managerName, {
      notes,
      manager_id: managerUser?.id || 'usr_mgr_01',
      unlocked_at: new Date().toISOString()
    });

    this.supabase.syncProposal(updated);
    this.supabase.syncAuditLog(log);
    this.invalidateCache(id);

    // Slack notification: Revisions unlocked
    this.slack
      .dispatchRevisionUnlockedNotification(updated, managerName, notes)
      .catch(() => {});

    return {
      success: true,
      message: 'Proposal successfully unlocked for revision. Sales rep may now make edits.',
      proposal: updated,
      unlocked_by: managerName
    };

  }

  exportEml(id: string, reqInfo: { host?: string; protocol?: string } = {}) {
    const proposal = this.storage.getProposalById(id);

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    const clientLink = `${reqInfo.protocol || 'http'}://${reqInfo.host || 'localhost:3000'}/client-view.html?id=${proposal.id}`;
    const emailData = this.claude.formatClientEmail(proposal, clientLink);

    const recipient = proposal.client_email || 'client@company.com';
    const sender = `${proposal.salesperson_name || 'Koya Talent'} <proposals@koyatalent.com>`;
    const safeCompany = (proposal.company_name || 'Client').replace(/[^a-zA-Z0-9_-]/g, '_');
    const rfcDate = new Date().toUTCString();

    const emlContent = [
      `From: ${sender}`,
      `To: ${proposal.client_name || 'Valued Client'} <${recipient}>`,
      `Subject: ${emailData.subject}`,
      `Date: ${rfcDate}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/plain; charset=UTF-8`,
      `X-Mailer: Koya Proposal Studio 3.0 (NestJS Edition)`,
      ``,
      emailData.body
    ].join('\r\n');

    return {
      filename: `Proposal_${safeCompany}.eml`,
      content: emlContent
    };
  }

  getPublicView(id: string) {
    const proposal = this.storage.getProposalById(id);
    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    const validUntil = proposal.valid_until || new Date(Date.now() + 30 * 86400000).toISOString();
    const isExpired = new Date() > new Date(validUntil);

    return {
      success: true,
      id: proposal.id,
      title: proposal.title,
      client_name: proposal.client_name,
      company_name: proposal.company_name,
      salesperson_name: proposal.salesperson_name,
      date_of_call: proposal.date_of_call,
      valid_until: validUntil,
      is_expired: isExpired,
      status: proposal.status,
      acceptance: proposal.acceptance || null,
      sections: proposal.sections
    };
  }

  async acceptProposal(id: string, signerName: string, signerTitle = 'Authorized Representative') {
    if (!signerName || !signerName.trim()) {
      throw new BadRequestException('Signer full name is required for legal acceptance.');
    }

    const proposal = this.storage.getProposalById(id);
    if (!proposal) {
      throw new NotFoundException(`Proposal ${id} not found`);
    }

    // Check expiration
    if (proposal.valid_until && new Date() > new Date(proposal.valid_until)) {
      throw new ConflictException('This proposal has expired beyond its 30-day validity window. Please contact your sales representative for an updated proposal.');
    }

    const trimmedName = signerName.trim();
    const trimmedTitle = (signerTitle || 'Authorized Representative').trim();
    const now = new Date().toISOString();
    const signatureHash = crypto
      .createHash('sha256')
      .update(`${id}:${trimmedName}:${now}`)
      .digest('hex')
      .substring(0, 16);

    const acceptance = {
      accepted_by_name: trimmedName,
      accepted_by_title: trimmedTitle,
      accepted_at: now,
      signature_hash: signatureHash
    };

    const updated = this.storage.updateProposal(
      id,
      {
        status: 'accepted',
        acceptance
      },
      trimmedName
    );

    const log = this.storage.addAuditLog(id, 'proposal_accepted_by_client', trimmedName, {
      signer_name: trimmedName,
      signer_title: trimmedTitle,
      signature_hash: signatureHash,
      accepted_at: now,
      previous_status: proposal.status
    });

    this.supabase.syncProposal(updated);
    this.supabase.syncAuditLog(log);
    this.invalidateCache(id);

    // Slack alert for deal won
    this.slack
      .dispatchProposalWonNotification(updated, trimmedName, trimmedTitle)
      .catch(() => {});

    return {
      success: true,
      message: 'Proposal successfully accepted and digitally executed.',
      proposal: updated
    };
  }

  exportAuditCsv(id: string) {
    const proposal = this.storage.getProposalById(id);
    if (!proposal) {
      throw new NotFoundException(`Proposal ${id} not found`);
    }

    const logs = this.storage.getAuditLogs(id);

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const lines: string[] = [
      ['Timestamp (UTC)', 'Proposal ID', 'Company', 'Action', 'Actor', 'Audit Details'].join(',')
    ];

    for (const log of logs) {
      lines.push(
        [
          escapeCsv(log.timestamp),
          escapeCsv(log.proposal_id),
          escapeCsv(proposal.company_name),
          escapeCsv(log.action),
          escapeCsv(log.actor),
          escapeCsv(log.details)
        ].join(',')
      );
    }

    return {
      filename: `proposal-audit-${id}.csv`,
      content: lines.join('\r\n')
    };
  }

  async simulateFailure(id: string, failureType = 'claude_timeout', requestId = '') {
    const proposal = this.storage.getProposalById(id);
    if (!proposal) {
      throw new NotFoundException(`Proposal ${id} not found`);
    }

    try {
      await this.claude.regenerateSection(proposal, 'pricing', 'Simulate fault', {
        injectFault: failureType
      });
      return { success: true };
    } catch (err: any) {
      const isTimeout =
        err.code === 'ETIMEDOUT' || err.status === 504 || err.message?.includes('timeout');

      const errorDetail = {
        code: err.code || (isTimeout ? 'ETIMEDOUT' : 'SIMULATED_FAULT'),
        service: 'Anthropic Claude API',
        message: err.message,
        request_id: requestId,
        timestamp: new Date().toISOString()
      };

      this.storage.addAuditLog(id, 'error', 'Real Fault Injector', errorDetail);
      this.slack
        .dispatchSystemErrorNotification(
          'UPSTREAM_MODEL_SERVICE_FAULT',
          `Upstream AI model fault encountered: ${err.message}`,
          errorDetail
        )
        .catch(() => {});

      return {
        caught: true,
        error: 'Upstream Model Failure Captured',
        diagnostics: errorDetail,
        audit_logged: true,
        debug_guidance:
          'Real error path verified: caught by Claude retry handler, logged in audit trail, and rendered in error drawer.'
      };
    }
  }
}
