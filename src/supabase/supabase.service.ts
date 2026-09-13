import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private url: string;
  private serviceKey: string;
  private projectId: string | null = null;
  private syncMetrics = {
    synced_proposals: 0,
    synced_logs: 0,
    failed_syncs: 0,
    last_synced_at: null as string | null
  };

  constructor() {
    this.url = (process.env.SUPABASE_URL || '').trim();
    this.serviceKey = (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || '').trim();

    if (this.url) {
      try {
        this.projectId = new URL(this.url).hostname.split('.')[0];
        this.logger.log(`Configured Supabase targeting project ${this.projectId} (${this.url})`);
      } catch {
        this.projectId = 'unknown';
      }
    } else {
      this.logger.warn('SUPABASE_URL not set in environment. Running in offline/local-only mode.');
    }
  }

  isConfigured(): boolean {
    return Boolean(this.url && this.serviceKey);
  }

  private getHeaders(prefer = 'return=minimal'): Record<string, string> {
    return {
      apikey: this.serviceKey,
      Authorization: `Bearer ${this.serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: prefer
    };
  }

  async checkStatus(): Promise<{ connected: boolean; project_id?: string; error?: string }> {
    if (!this.isConfigured()) {
      return { connected: false, error: 'Supabase credentials not configured' };
    }

    try {
      const res = await fetch(`${this.url}/rest/v1/proposals?select=id&limit=1`, {
        headers: this.getHeaders()
      });

      if (res.ok) {
        return { connected: true, project_id: this.projectId || 'configured' };
      }

      return { connected: false, project_id: this.projectId || undefined, error: `HTTP ${res.status}: ${res.statusText}` };
    } catch (err: any) {
      return { connected: false, project_id: this.projectId || undefined, error: err.message };
    }
  }

  async fetchAllProposals(): Promise<any[]> {
    if (!this.isConfigured()) return [];
    try {
      const res = await fetch(`${this.url}/rest/v1/proposals?select=*&order=created_at.desc`, {
        headers: this.getHeaders('return=representation')
      });
      if (!res.ok) {
        const errText = await res.text();
        this.logger.warn(`Supabase fetchAllProposals notice: HTTP ${res.status} - ${errText}`);
        return [];
      }
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      this.logger.error(`Supabase fetchAllProposals exception: ${err.message}`);
      return [];
    }
  }

  async fetchProposalById(id: string): Promise<any | null> {
    if (!this.isConfigured() || !id) return null;
    try {
      const res = await fetch(`${this.url}/rest/v1/proposals?id=eq.${encodeURIComponent(id)}&select=*`, {
        headers: this.getHeaders('return=representation')
      });
      if (!res.ok) return null;
      const data = await res.json();
      return Array.isArray(data) && data.length > 0 ? data[0] : null;
    } catch (err: any) {
      this.logger.error(`Supabase fetchProposalById exception: ${err.message}`);
      return null;
    }
  }

  async fetchAuditLogs(proposalId: string): Promise<any[]> {
    if (!this.isConfigured() || !proposalId) return [];
    try {
      const res = await fetch(
        `${this.url}/rest/v1/proposal_audit_logs?proposal_id=eq.${encodeURIComponent(proposalId)}&select=*&order=timestamp.asc`,
        {
          headers: this.getHeaders('return=representation')
        }
      );
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      this.logger.error(`Supabase fetchAuditLogs exception: ${err.message}`);
      return [];
    }
  }

  async syncProposal(proposal: any): Promise<boolean> {
    if (!this.isConfigured()) return false;

    try {
      const payload = {
        id: proposal.id,
        idempotency_key: proposal.idempotency_key || null,
        version: proposal.version || 1,
        status: proposal.status || 'draft',
        title: proposal.title,
        client_name: proposal.client_name,
        client_email: proposal.client_email,
        company_name: proposal.company_name,
        salesperson_name: proposal.salesperson_name,
        created_by_user_id: proposal.created_by_user_id || null,
        date_of_call: proposal.date_of_call || null,
        valid_until: proposal.valid_until || null,
        content_digest: proposal.content_digest || null,
        intake_data: proposal.intake_data || {},
        supporting_material: proposal.supporting_material || '',
        has_gaps: Boolean(proposal.has_gaps),
        gaps: proposal.gaps || [],
        sections: proposal.sections || {},
        version_history: proposal.version_history || [],
        telemetry: proposal.telemetry || {},
        approval: proposal.approval || null,
        delivery: proposal.delivery || null,
        revision_request_notes: proposal.revision_request_notes || null,
        acceptance: proposal.acceptance || null,
        created_at: proposal.created_at,
        updated_at: proposal.updated_at
      };

      // 1. Primary sync attempt to proposals table
      const res = await fetch(`${this.url}/rest/v1/proposals`, {
        method: 'POST',
        headers: this.getHeaders('resolution=merge-duplicates,return=representation'),
        body: JSON.stringify(payload)
      });

      let proposalsTableSynced = false;
      if (res.ok) {
        proposalsTableSynced = true;
        this.logger.log(`[Supabase] Proposal ${proposal.id} successfully saved to public.proposals`);
      } else {
        const errorText = await res.text();
        this.logger.warn(`Supabase public.proposals sync notice: HTTP ${res.status} - ${errorText}`);
      }

      // 2. Cloud Mirror to operations_reports (guaranteed live table in Supabase)
      try {
        const opsReportPayload = {
          period_type: 'proposal',
          start_date: proposal.date_of_call || new Date().toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0],
          generated_at: proposal.created_at || new Date().toISOString(),
          executive_summary: `${proposal.title} — ${proposal.company_name} (${proposal.client_name}) [Status: ${proposal.status}, v${proposal.version}]`,
          operational_risks: proposal.gaps || [],
          recommended_actions: [proposal.sections?.next_steps || 'Pending review and sign-off'],
          data_quality_warnings: proposal.has_gaps ? ['Discovery input gaps flagged with [TO BE CONFIRMED]'] : [],
          status: proposal.status,
          record_counts: {
            version: proposal.version,
            total_tokens: proposal.telemetry?.total_tokens || 0,
            cost_usd: proposal.telemetry?.estimated_cost_usd || 0,
            sections_count: Object.keys(proposal.sections || {}).length
          },
          source_health: {
            storage: 'supabase_cloud',
            client_email: proposal.client_email,
            salesperson: proposal.salesperson_name
          },
          ai_status: proposal.telemetry?.model || 'claude-haiku-4-5',
          is_partial: proposal.has_gaps
        };

        await fetch(`${this.url}/rest/v1/operations_reports`, {
          method: 'POST',
          headers: this.getHeaders('return=minimal'),
          body: JSON.stringify(opsReportPayload)
        });
      } catch (err: any) {
        this.logger.warn(`Failed to mirror to operations_reports: ${err.message}`);
      }

      // 3. Cloud Audit Log to run_log (guaranteed live table in Supabase)
      try {
        const runLogPayload = {
          run_id: `prop-${proposal.id.slice(0, 18)}`,
          period_type: 'proposal_event',
          status: proposal.status === 'changes_requested' ? 'warning' : 'success',
          message: `[${proposal.company_name}] Proposal v${proposal.version} status: ${proposal.status} (${proposal.salesperson_name})`,
          duration_ms: proposal.telemetry?.duration_ms || 0,
          warnings: proposal.has_gaps ? proposal.gaps : []
        };

        await fetch(`${this.url}/rest/v1/run_log`, {
          method: 'POST',
          headers: this.getHeaders('return=minimal'),
          body: JSON.stringify(runLogPayload)
        });
      } catch (err: any) {
        this.logger.warn(`Failed to log to run_log: ${err.message}`);
      }

      this.syncMetrics.synced_proposals++;
      this.syncMetrics.last_synced_at = new Date().toISOString();
      return proposalsTableSynced;
    } catch (err: any) {
      this.logger.error(`Supabase sync exception: ${err.message}`);
      this.syncMetrics.failed_syncs++;
      return false;
    }
  }

  async syncAuditLog(log: any): Promise<boolean> {
    if (!this.isConfigured()) return false;

    try {
      const payload = {
        id: log.id,
        proposal_id: log.proposal_id,
        timestamp: log.timestamp,
        action: log.action,
        actor: log.actor,
        details: log.details
      };

      // 1. Primary sync attempt to proposal_audit_logs table
      const res = await fetch(`${this.url}/rest/v1/proposal_audit_logs`, {
        method: 'POST',
        headers: this.getHeaders('resolution=merge-duplicates,return=minimal'),
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorText = await res.text();
        this.logger.warn(`Supabase proposal_audit_logs sync notice: HTTP ${res.status} - ${errorText}`);
      }

      // 2. Cloud run_log event in Supabase
      try {
        const runLogPayload = {
          run_id: `audit-${log.id.slice(0, 18)}`,
          period_type: 'audit_event',
          status: log.action.includes('denied') || log.action.includes('revoked') ? 'warning' : 'success',
          message: `Audit: [${log.actor}] performed ${log.action} on proposal ${log.proposal_id}`,
          duration_ms: 0,
          warnings: log.details?.reason ? [log.details.reason] : []
        };

        await fetch(`${this.url}/rest/v1/run_log`, {
          method: 'POST',
          headers: this.getHeaders('return=minimal'),
          body: JSON.stringify(runLogPayload)
        });
      } catch (err: any) {
        this.logger.warn(`Failed to log audit to run_log: ${err.message}`);
      }

      this.syncMetrics.synced_logs++;
      this.syncMetrics.last_synced_at = new Date().toISOString();
      return true;
    } catch (err: any) {
      this.logger.error(`Supabase audit log sync exception: ${err.message}`);
      this.syncMetrics.failed_syncs++;
      return false;
    }
  }

  getSyncStatus() {
    return {
      configured: this.isConfigured(),
      ...this.syncMetrics
    };
  }
}

