import { Injectable, Logger, ConflictException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: 'sales' | 'manager';
  title: string;
  passwordHash: string;
}

export interface AuditLog {
  id: string;
  proposal_id: string;
  timestamp: string;
  action: string;
  actor: string;
  details: Record<string, any>;
}

export interface Proposal {
  id: string;
  idempotency_key?: string;
  version: number;
  status: 'draft' | 'pending_approval' | 'approved' | 'changes_requested' | 'delivered' | 'revision_requested' | 'accepted' | 'expired';
  title: string;
  client_name: string;
  client_email: string;
  company_name: string;
  salesperson_name: string;
  created_by_user_id?: string;
  last_edited_by_user_id?: string;
  last_edited_by_name?: string;
  last_edited_by_role?: string;
  date_of_call: string;
  valid_until?: string;
  content_digest?: string;
  intake_data: Record<string, any>;
  supporting_material: string;
  has_gaps: boolean;
  gaps: any[];
  sections: Record<string, string>;
  version_history?: any[];
  telemetry?: Record<string, any>;
  approval?: {
    status: string;
    approved_by?: string;
    approved_at?: string;
    requested_at?: string;
    feedback_notes?: string;
  };
  delivery?: {
    is_delivered: boolean;
    delivered_at?: string | null;
    client_email?: string;
    cc?: string[];
    email_subject?: string;
    email_body?: string;
    delivery_status?: string;
    error_details?: string;
  };
  revision_request_notes?: string;
  acceptance?: {
    accepted_by_name: string;
    accepted_by_title?: string;
    accepted_at: string;
    signature_hash?: string;
  };
  client_access_token?: string;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly dataDir: string;
  private readonly dbFile: string;
  private writeQueue: Promise<void> = Promise.resolve();
  private cache: { proposals: Proposal[]; audit_logs: AuditLog[]; users: UserRecord[] };

  constructor() {
    this.dataDir = path.join(process.cwd(), 'data');
    this.dbFile = path.join(this.dataDir, 'database.json');

    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    this.cache = this.loadDatabase();
  }

  private loadDatabase(): { proposals: Proposal[]; audit_logs: AuditLog[]; users: UserRecord[] } {
    try {
      if (fs.existsSync(this.dbFile)) {
        const raw = fs.readFileSync(this.dbFile, 'utf8');
        const parsed = JSON.parse(raw);
        return {
          proposals: parsed.proposals || [],
          audit_logs: parsed.audit_logs || [],
          users: parsed.users || []
        };
      }
    } catch (err: any) {
      this.logger.error(`Error loading database file: ${err.message}. Initializing fresh defaults.`);
    }
    return { proposals: [], audit_logs: [], users: [] };
  }

  getUsers(): UserRecord[] {
    return this.cache.users || [];
  }

  getUserByEmail(email: string): UserRecord | undefined {
    return (this.cache.users || []).find(
      (u) => u.email.toLowerCase() === (email || '').toLowerCase().trim()
    );
  }

  saveUsers(users: UserRecord[]): void {
    this.cache.users = users;
    this.queueSave();
  }

  private queueSave(): Promise<void> {
    this.writeQueue = this.writeQueue.then(() => {
      try {
        const tmpFile = `${this.dbFile}.tmp`;
        fs.writeFileSync(tmpFile, JSON.stringify(this.cache, null, 2), 'utf8');
        fs.renameSync(tmpFile, this.dbFile);
      } catch (err: any) {
        this.logger.error(`Failed atomic save: ${err.message}`);
      }
    });
    return this.writeQueue;
  }

  canWrite(): boolean {
    try {
      const testFile = path.join(this.dataDir, '.write_test');
      fs.writeFileSync(testFile, 'ok', 'utf8');
      fs.unlinkSync(testFile);
      return true;
    } catch {
      return false;
    }
  }

  computeContentHash(sections: Record<string, string>): string {
    const sorted = Object.keys(sections || {})
      .sort()
      .reduce((acc, k) => {
        acc[k] = (sections[k] || '').trim();
        return acc;
      }, {} as Record<string, string>);
    return crypto.createHash('sha256').update(JSON.stringify(sorted)).digest('hex');
  }

  getProposals(): Proposal[] {
    return this.cache.proposals;
  }

  hydrateProposals(proposals: Proposal[]): void {
    if (!Array.isArray(proposals)) return;
    const existingMap = new Map(this.cache.proposals.map(p => [p.id, p]));
    for (const p of proposals) {
      if (!p.client_access_token) {
        p.client_access_token = this.getClientAccessToken(p);
      }
      existingMap.set(p.id, p);
    }
    this.cache.proposals = Array.from(existingMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    this.queueSave();
  }

  hydrateProposal(proposal: Proposal): void {
    if (!proposal || !proposal.id) return;
    if (!proposal.client_access_token) {
      proposal.client_access_token = this.getClientAccessToken(proposal);
    }
    const idx = this.cache.proposals.findIndex(p => p.id === proposal.id);
    if (idx >= 0) {
      this.cache.proposals[idx] = proposal;
    } else {
      this.cache.proposals.unshift(proposal);
    }
    this.queueSave();
  }

  hydrateAuditLogs(proposalId: string, logs: AuditLog[]): void {
    if (!Array.isArray(logs)) return;
    const otherLogs = this.cache.audit_logs.filter(l => l.proposal_id !== proposalId);
    const existingIds = new Set(otherLogs.map(l => l.id));
    for (const log of logs) {
      if (!existingIds.has(log.id)) {
        otherLogs.push(log);
        existingIds.add(log.id);
      }
    }
    this.cache.audit_logs = otherLogs.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    this.queueSave();
  }

  getProposalById(id: string): Proposal | undefined {
    return this.cache.proposals.find((p) => p.id === id);
  }

  findByIdempotencyKey(key: string): Proposal | undefined {
    if (!key) return undefined;
    return this.cache.proposals.find((p) => p.idempotency_key === key);
  }

  createProposal(data: Partial<Proposal>): Proposal {
    const now = new Date().toISOString();
    const id = `prop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const digest = this.computeContentHash(data.sections || {});

    const validUntilDate = new Date();
    validUntilDate.setDate(validUntilDate.getDate() + 30);
    const valid_until = data.valid_until || validUntilDate.toISOString();

    const client_access_token = crypto
      .createHmac('sha256', process.env.JWT_SECRET || 'koya_enterprise_jwt_secret_2026_secure_key')
      .update(`${id}:${data.client_email || 'client'}`)
      .digest('hex')
      .substring(0, 32);

    const newProposal: Proposal = {
      id,
      client_access_token,
      idempotency_key: data.idempotency_key,
      version: 1,
      status: 'draft',
      title: data.title || `Proposal for ${data.company_name || 'Client'}`,
      client_name: data.client_name || 'Client Contact',
      client_email: data.client_email || 'client@company.com',
      company_name: data.company_name || 'Target Company',
      salesperson_name: data.salesperson_name || 'Sarah Chen',
      created_by_user_id: data.created_by_user_id || 'usr_sales_01',
      date_of_call: data.date_of_call || now.split('T')[0],
      valid_until,
      content_digest: digest,
      intake_data: data.intake_data || {},
      supporting_material: data.supporting_material || '',
      has_gaps: Boolean(data.has_gaps),
      gaps: data.gaps || [],
      sections: data.sections || {},
      version_history: [
        {
          version: 1,
          timestamp: now,
          actor: data.salesperson_name || 'Sarah Chen',
          action: 'Initial Claude Generation',
          digest,
          sections_snapshot: { ...(data.sections || {}) }
        }
      ],
      telemetry: data.telemetry || {},
      approval: {
        status: 'draft',
        feedback_notes: ''
      },
      delivery: {
        is_delivered: false
      },
      created_at: now,
      updated_at: now
    };

    this.cache.proposals.unshift(newProposal);
    this.queueSave();

    this.addAuditLog(id, 'created', newProposal.salesperson_name, {
      message: 'Proposal generated with Claude Haiku 4.5',
      sections_count: Object.keys(newProposal.sections).length,
      has_gaps: newProposal.has_gaps,
      digest
    });

    return newProposal;
  }

  getClientAccessToken(proposal: Proposal): string {
    if (proposal.client_access_token) return proposal.client_access_token;
    return crypto
      .createHmac('sha256', process.env.JWT_SECRET || 'koya_enterprise_jwt_secret_2026_secure_key')
      .update(`${proposal.id}:${proposal.client_email || 'client'}`)
      .digest('hex')
      .substring(0, 32);
  }

  updateProposal(id: string, updates: Partial<Proposal>, actor: string): Proposal | null {
    const index = this.cache.proposals.findIndex((p) => p.id === id);
    if (index === -1) return null;

    const existing = this.cache.proposals[index];
    const now = new Date().toISOString();

    const updated: Proposal = {
      ...existing,
      ...updates,
      updated_at: now
    };

    if (updates.sections) {
      updated.content_digest = this.computeContentHash(updates.sections);
    }

    this.cache.proposals[index] = updated;
    this.queueSave();
    return updated;
  }

  updateSection(
    id: string,
    sectionKey: string,
    content: string,
    actor: string,
    telemetry?: Record<string, any>,
    actorUser?: { id?: string; name?: string; role?: string }
  ): Proposal | null {
    const index = this.cache.proposals.findIndex((p) => p.id === id);
    if (index === -1) return null;

    const proposal = this.cache.proposals[index];
    
    // Delivery Lock: Delivered proposals are legally immutable
    if (proposal.status === 'delivered' || proposal.delivery?.is_delivered) {
      throw new ConflictException(
        `Proposal ${id} has already been delivered to ${proposal.delivery?.client_email || proposal.client_email} and is legally locked against modification.`
      );
    }
    const now = new Date().toISOString();
    const newVersion = proposal.version + 1;

    const updatedSections = {
      ...proposal.sections,
      [sectionKey]: content
    };

    const newDigest = this.computeContentHash(updatedSections);

    const historyEntry = {
      version: newVersion,
      timestamp: now,
      actor,
      action: `Updated section: ${sectionKey}`,
      modified_section: sectionKey,
      previous_content: proposal.sections[sectionKey] || '',
      new_content: content,
      sections_snapshot: { ...updatedSections },
      digest: newDigest,
      telemetry: telemetry || null
    };

    const wasApproved = proposal.status === 'approved';
    const updatedStatus = wasApproved ? 'draft' : proposal.status;
    const updatedApproval = wasApproved
      ? {
          status: 'draft',
          feedback_notes: 'Approval automatically revoked due to post-approval content modification (Tamper Guard).'
        }
      : proposal.approval;

    const resolvedEditorId =
      actorUser?.id ||
      (actor.includes('Marcus')
        ? 'usr_mgr_01'
        : actor.includes('Elena')
        ? 'usr_mgr_02'
        : actor.includes('Sarah')
        ? 'usr_sales_01'
        : undefined);

    const resolvedEditorRole =
      actorUser?.role ||
      (actor.includes('Marcus') || actor.includes('Elena') || actor.toLowerCase().includes('manager')
        ? 'manager'
        : 'sales');

    const updated: Proposal = {
      ...proposal,
      version: newVersion,
      status: updatedStatus,
      approval: updatedApproval,
      sections: updatedSections,
      content_digest: newDigest,
      last_edited_by_user_id: resolvedEditorId,
      last_edited_by_name: actorUser?.name || actor,
      last_edited_by_role: resolvedEditorRole,
      version_history: [...(proposal.version_history || []), historyEntry],
      updated_at: now
    };

    this.cache.proposals[index] = updated;
    this.queueSave();

    this.addAuditLog(id, 'section_updated', actor, {
      section: sectionKey,
      new_version: newVersion,
      digest: newDigest,
      telemetry: telemetry || null
    });

    if (wasApproved) {
      this.addAuditLog(id, 'approval_revoked_tamper_guard', 'Tamper Guard', {
        previous_status: 'approved',
        new_status: 'draft',
        reason: `Section "${sectionKey}" modified post-approval by ${actor}. Re-approval required before delivery.`
      });
    }

    return updated;
  }

  addAuditLog(proposalId: string, action: string, actor: string, details: Record<string, any> = {}): AuditLog {
    const log: AuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      proposal_id: proposalId,
      timestamp: new Date().toISOString(),
      action,
      actor: actor || 'System',
      details
    };

    this.cache.audit_logs.unshift(log);
    this.queueSave();
    return log;
  }

  getAuditLogs(proposalId: string): AuditLog[] {
    return this.cache.audit_logs.filter((l) => l.proposal_id === proposalId);
  }
}
