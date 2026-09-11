import { Proposal, AuditLog, SlackDispatchResult, User } from '../types';

const API_BASE = '/api';

export class ApiError extends Error {
  status: number;
  data: any;
  requestId?: string;

  constructor(message: string, status: number, data: any, requestId?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.requestId = requestId;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<{ data: T; requestId?: string }> {
  const token = localStorage.getItem('koya_token');
  const headers = new Headers(options.headers || {});

  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  const requestId = res.headers.get('x-request-id') || undefined;
  let body: any;
  const contentType = res.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    body = await res.json();
  } else {
    body = await res.text();
  }

  if (!res.ok) {
    const errorMsg = body?.message || body?.error || `HTTP error ${res.status}`;
    throw new ApiError(errorMsg, res.status, body, requestId);
  }

  return { data: body, requestId };
}

export const api = {
  async login(email: string, pass: string): Promise<{ success: boolean; accessToken: string; user: User }> {
    const res = await request<{ success: boolean; accessToken: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: pass })
    });
    return res.data;
  },

  async getAuthContext(): Promise<{ success: boolean; users: User[]; demo_mode: boolean; credentials_hint: any }> {
    const res = await request<{ success: boolean; users: User[]; demo_mode: boolean; credentials_hint: any }>('/auth/context');
    return res.data;
  },

  async getProposals(): Promise<{ success: boolean; count: number; proposals: Proposal[] }> {
    const res = await request<{ success: boolean; count: number; proposals: Proposal[] }>('/proposals');
    return res.data;
  },

  async getProposal(id: string): Promise<{ success: boolean; proposal: Proposal; audit_logs: AuditLog[] }> {
    const res = await request<{ success: boolean; proposal: Proposal; audit_logs: AuditLog[] }>(`/proposals/${id}`);
    return res.data;
  },

  async generateProposal(
    intakeData: Record<string, any>,
    supportingMaterial = '',
    idempotencyKey?: string
  ): Promise<{ success: boolean; proposal: Proposal; gap_analysis: any; idempotent_replay?: boolean }> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    const res = await request<{ success: boolean; proposal: Proposal; gap_analysis: any; idempotent_replay?: boolean }>(
      '/proposals/generate',
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          intake_data: intakeData,
          supporting_material: supportingMaterial
        })
      }
    );
    return res.data;
  },

  async updateSection(
    id: string,
    sectionKey: string,
    content: string,
    actor?: string
  ): Promise<{ success: boolean; proposal: Proposal }> {
    const res = await request<{ success: boolean; proposal: Proposal }>(`/proposals/${id}/section`, {
      method: 'PUT',
      body: JSON.stringify({
        section_key: sectionKey,
        content,
        actor
      })
    });
    return res.data;
  },

  async regenerateSection(
    id: string,
    sectionKey: string,
    instruction: string,
    actor?: string
  ): Promise<{ success: boolean; section_key: string; revised_content: string; proposal: Proposal }> {
    const res = await request<{ success: boolean; section_key: string; revised_content: string; proposal: Proposal }>(
      `/proposals/${id}/regenerate-section`,
      {
        method: 'POST',
        body: JSON.stringify({
          section_key: sectionKey,
          instruction,
          actor
        })
      }
    );
    return res.data;
  },

  async submitForApproval(
    id: string,
    actor?: string
  ): Promise<{ success: boolean; proposal: Proposal; slack_dispatch: SlackDispatchResult }> {
    const res = await request<{ success: boolean; proposal: Proposal; slack_dispatch: SlackDispatchResult }>(
      `/proposals/${id}/submit-for-approval`,
      {
        method: 'POST',
        body: JSON.stringify({ actor })
      }
    );
    return res.data;
  },

  async testSlack(
    id: string,
    actor?: string
  ): Promise<{ success: boolean; slack_dispatch: SlackDispatchResult }> {
    const res = await request<{ success: boolean; slack_dispatch: SlackDispatchResult }>(
      `/proposals/${id}/test-slack`,
      {
        method: 'POST',
        body: JSON.stringify({ actor })
      }
    );
    return res.data;
  },

  async approveProposal(
    id: string,
    feedbackNotes?: string
  ): Promise<{ success: boolean; proposal: Proposal; approved_by: string; approved_at: string }> {
    const res = await request<{ success: boolean; proposal: Proposal; approved_by: string; approved_at: string }>(
      `/proposals/${id}/approve`,
      {
        method: 'POST',
        body: JSON.stringify({ feedback_notes: feedbackNotes })
      }
    );
    return res.data;
  },

  async requestChanges(
    id: string,
    feedbackNotes?: string
  ): Promise<{ success: boolean; proposal: Proposal }> {
    const res = await request<{ success: boolean; proposal: Proposal }>(`/proposals/${id}/request-changes`, {
      method: 'POST',
      body: JSON.stringify({ feedback_notes: feedbackNotes })
    });
    return res.data;
  },

  async deliverProposal(
    id: string,
    clientEmail?: string
  ): Promise<{ success: boolean; message: string; proposal: Proposal; delivery_details: any }> {
    const res = await request<{ success: boolean; message: string; proposal: Proposal; delivery_details: any }>(
      `/proposals/${id}/deliver`,
      {
        method: 'POST',
        body: JSON.stringify({ client_email: clientEmail })
      }
    );
    return res.data;
  },

  async simulateFailure(
    id: string,
    failureType = 'claude_timeout'
  ): Promise<any> {
    const res = await request<any>(`/proposals/${id}/simulate-failure`, {
      method: 'POST',
      body: JSON.stringify({ failure_type: failureType })
    });
    return res.data;
  },

  async requestClientRevision(
    id: string,
    clientFeedback: string,
    actor?: string
  ): Promise<{ success: boolean; message: string; proposal: Proposal }> {
    const res = await request<{ success: boolean; message: string; proposal: Proposal }>(
      `/proposals/${id}/request-client-revision`,
      {
        method: 'POST',
        body: JSON.stringify({ client_feedback: clientFeedback, actor })
      }
    );
    return res.data;
  },

  async approveRevisionUnlock(
    id: string,
    approvalNotes: string
  ): Promise<{ success: boolean; message: string; proposal: Proposal }> {
    const res = await request<{ success: boolean; message: string; proposal: Proposal }>(
      `/proposals/${id}/approve-revision-unlock`,
      {
        method: 'POST',
        body: JSON.stringify({ approval_notes: approvalNotes })
      }
    );
    return res.data;
  },

  async getHealth(): Promise<any> {
    const res = await fetch('/healthz');
    return res.json();
  }
};

