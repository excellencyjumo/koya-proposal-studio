export type Role = 'sales' | 'manager';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  title: string;
}

export interface TelemetryData {
  model: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
  duration_ms: number;
  stop_reason: string;
  truncated: boolean;
}

export interface ProposalSections {
  introduction: string;
  project_scope: string;
  recommended_approach: string;
  deliverables: string;
  timeline: string;
  pricing: string;
  next_steps: string;
  [key: string]: string;
}

export interface GapItem {
  field: string;
  severity?: 'critical' | 'high' | 'medium' | 'low' | string;
  issue?: string;
  recommendation?: string;
  question?: string;
  [key: string]: any;
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
  status: 'draft' | 'pending_approval' | 'approved' | 'changes_requested' | 'delivered' | 'revision_requested' | 'accepted';
  title: string;
  client_name: string;
  client_email: string;
  company_name: string;
  salesperson_name: string;
  created_by_user_id?: string;
  date_of_call: string;
  valid_until?: string;
  content_digest?: string;
  intake_data: Record<string, any>;
  supporting_material: string;
  has_gaps: boolean;
  gaps: GapItem[];
  sections: ProposalSections;
  version_history?: any[];
  telemetry?: TelemetryData;
  approval?: {
    status: string;
    approved_by?: string;
    approved_at?: string;
    requested_at?: string;
    feedback_notes?: string;
  };
  delivery?: {
    is_delivered: boolean;
    delivered_at?: string;
    client_email?: string;
    email_subject?: string;
    email_body?: string;
    delivery_status?: string;
  };
  revision_request_notes?: string;
  acceptance?: {
    accepted_by_name: string;
    accepted_by_title?: string;
    accepted_at: string;
    signature_hash?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface SlackDispatchResult {
  dispatched?: boolean;
  mode?: 'live' | 'preview_only' | 'failed' | 'error' | string;
  status?: string;
  http_status?: number;
  channel?: string;
  recipient?: string;
  reason?: string;
  error?: string;
  payload?: any;
  block_kit_payload?: any;
  [key: string]: any;
}

