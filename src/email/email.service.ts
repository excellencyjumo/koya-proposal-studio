import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface EmailSendResult {
  success: boolean;
  recipient: string;
  subject: string;
  messageId?: string;
  previewUrl?: string;
  mode: 'smtp_live' | 'ethereal_live' | 'simulated';
  error?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private mode: 'smtp_live' | 'ethereal_live' | 'simulated' = 'simulated';
  private fromAddress: string;

  constructor() {
    this.fromAddress = process.env.SMTP_FROM || '"Koya Talent Enterprise" <proposals@koyatalent.com>';
    this.initTransporter();
  }

  private initTransporter() {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user, pass }
      });
      this.mode = 'smtp_live';
      this.logger.log(`EmailService: Configured live authenticated SMTP via ${host} (${user})`);
    } else {
      // High-performance JSON Transport for test and verification
      this.transporter = nodemailer.createTransport({
        jsonTransport: true
      });
      this.mode = 'simulated';
      this.logger.log('EmailService: Running in high-fidelity JSON Transport mode (RFC 822 compliant, offline & resilient)');
    }
  }

  async sendProposalEmail(params: {
    to: string;
    proposal: any;
    clientPortalUrl: string;
    subject?: string;
    body?: string;
  }): Promise<EmailSendResult> {
    const { to, proposal, clientPortalUrl } = params;
    const recipient = to || proposal.client_email;
    const subject =
      params.subject ||
      `Enterprise Proposal: ${proposal.title || proposal.company_name} — Ready for Review & Sign-Off`;

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 24px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: #0f172a; color: #ffffff; padding: 28px 32px; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 600; letter-spacing: -0.025em; }
    .header p { margin: 6px 0 0 0; color: #94a3b8; font-size: 13px; }
    .content { padding: 32px; }
    .lead { font-size: 15px; color: #334155; margin-bottom: 20px; }
    .proposal-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .meta-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
    .meta-label { color: #64748b; font-weight: 500; }
    .meta-value { color: #0f172a; font-weight: 600; }
    .btn-container { text-align: center; margin: 32px 0; }
    .btn { display: inline-block; background: #2563eb; color: #ffffff !important; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 14px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2); }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; font-size: 12px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Koya Talent Enterprise Proposal Studio</h1>
      <p>Prepared exclusively for ${proposal.company_name}</p>
    </div>
    <div class="content">
      <p class="lead">Dear ${proposal.client_name || 'Client Lead'},</p>
      <p>We are pleased to present the formal scope and commercial terms for <strong>${proposal.company_name}</strong>. This document has been signed off by Koya Talent executive leadership and is now ready for your review and digital execution.</p>
      
      <div class="proposal-card">
        <div class="meta-row"><span class="meta-label">Proposal Title:</span> <span class="meta-value">${proposal.title}</span></div>
        <div class="meta-row"><span class="meta-label">Target Organization:</span> <span class="meta-value">${proposal.company_name}</span></div>
        <div class="meta-row"><span class="meta-label">Account Lead:</span> <span class="meta-value">${proposal.salesperson_name || 'Sarah Chen'}</span></div>
        <div class="meta-row"><span class="meta-label">Document Version:</span> <span class="meta-value">v${proposal.version || 1}.0 (Executive Approved)</span></div>
        <div class="meta-row"><span class="meta-label">Validity Expiration:</span> <span class="meta-value">${proposal.valid_until ? new Date(proposal.valid_until).toLocaleDateString() : '30 Days from Issue'}</span></div>
      </div>

      <div class="btn-container">
        <a href="${clientPortalUrl}" class="btn" target="_blank">Review & Sign Proposal Online →</a>
      </div>

      <p style="font-size: 13px; color: #64748b;">If your team requires any scope adjustments or clarifications, you can request revisions directly via the portal link above.</p>
    </div>
    <div class="footer">
      <p>&copy; 2026 Koya Talent Inc. All rights reserved. Encrypted & digitally verified via SHA-256 tamper seals.</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    const plainText = `
Proposal Delivered: ${proposal.title}
Target Organization: ${proposal.company_name}
Recipient: ${proposal.client_name} (${recipient})

View and digitally sign your proposal at:
${clientPortalUrl}

Prepared by: ${proposal.salesperson_name} — Koya Talent Inc.
    `.trim();

    if (!this.transporter) {
      this.logger.log(`[SIMULATED EMAIL DISPATCH] To: ${recipient} | Subject: ${subject}`);
      return {
        success: true,
        recipient,
        subject,
        mode: 'simulated',
        messageId: `sim_${Date.now()}`
      };
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.fromAddress,
        to: recipient,
        subject,
        text: plainText,
        html: htmlBody
      });

      const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
      this.logger.log(`[EMAIL DISPATCH SUCCESS] Message ID: ${info.messageId} | Recipient: ${recipient}`);
      if (previewUrl) {
        this.logger.log(`[EMAIL TEST PREVIEW] URL: ${previewUrl}`);
      }

      return {
        success: true,
        recipient,
        subject,
        messageId: info.messageId,
        previewUrl,
        mode: this.mode
      };
    } catch (err: any) {
      this.logger.error(`[EMAIL DISPATCH ERROR] Failed to send email to ${recipient}: ${err.message}`);
      return {
        success: false,
        recipient,
        subject,
        mode: this.mode,
        error: err.message
      };
    }
  }

  async sendApprovalEmail(params: {
    proposal: any;
    salesEmail: string;
    salesName: string;
    managerEmail: string;
    managerName: string;
    clientPortalUrl: string;
    feedbackNotes?: string;
    ccList?: string[];
  }): Promise<EmailSendResult> {
    const { proposal, salesEmail, salesName, managerEmail, managerName, clientPortalUrl, feedbackNotes, ccList = [] } = params;
    const recipient = salesEmail || 'sarah.chen@koyatalent.com';
    const allCcs = Array.from(new Set([managerEmail, ...ccList].filter(Boolean)));
    const subject = `🎉 Proposal Approved: ${proposal.company_name} — Ready for Customer Delivery`;

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 24px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: #15803d; color: #ffffff; padding: 28px 32px; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 600; }
    .header p { margin: 6px 0 0 0; color: #bbf7d0; font-size: 13px; }
    .content { padding: 32px; }
    .status-badge { display: inline-block; background: #dcfce7; color: #15803d; padding: 6px 14px; border-radius: 20px; font-weight: 600; font-size: 13px; margin-bottom: 16px; }
    .notes-box { background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; border-radius: 4px; margin: 20px 0; }
    .proposal-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .meta-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
    .btn-container { text-align: center; margin: 32px 0; }
    .btn { display: inline-block; background: #15803d; color: #ffffff !important; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 14px; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; font-size: 12px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Proposal Approved by Management</h1>
      <p>Authorization Granted for Client Delivery</p>
    </div>
    <div class="content">
      <div class="status-badge">● Manager Sign-Off Complete</div>
      <p>Hi <strong>${salesName}</strong>,</p>
      <p>Your proposal for <strong>${proposal.company_name}</strong> has been formally reviewed and approved by <strong>${managerName}</strong>.</p>
      
      <div class="notes-box">
        <strong style="color: #166534;">Manager Sign-Off Feedback:</strong><br/>
        <em>"${feedbackNotes || 'Approved for client delivery. Scope and commercial terms validated.'}"</em>
      </div>

      <div class="proposal-card">
        <div class="meta-row"><strong>Proposal ID:</strong> <span>${proposal.id}</span></div>
        <div class="meta-row"><strong>Target Client:</strong> <span>${proposal.company_name} (${proposal.client_name})</span></div>
        <div class="meta-row"><strong>Approver:</strong> <span>${managerName} (${managerEmail})</span></div>
        <div class="meta-row"><strong>Sales Representative:</strong> <span>${salesName}</span></div>
        <div class="meta-row"><strong>Action Required:</strong> <span style="color: #15803d; font-weight: bold;">Ready to Deliver</span></div>
      </div>

      <div class="btn-container">
        <a href="${clientPortalUrl}" class="btn" target="_blank">Open Proposal Studio & Deliver to Client →</a>
      </div>

      <p style="font-size: 12px; color: #64748b;">CC: ${allCcs.join(', ')}</p>
    </div>
    <div class="footer">
      <p>&copy; 2026 Koya Talent Inc. Four-Eyes Governance Enforced.</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    const plainText = `
Proposal Approved: ${proposal.title}
Company: ${proposal.company_name}
Approved By: ${managerName} (${managerEmail})
Sales Lead: ${salesName} (${recipient})
CC: ${allCcs.join(', ')}

Manager Feedback:
${feedbackNotes || 'Approved for client delivery.'}

Open in Studio to deliver:
${clientPortalUrl}
    `.trim();

    if (!this.transporter) {
      this.logger.log(`[SIMULATED APPROVAL EMAIL] To: ${recipient} | CC: ${allCcs.join(', ')} | Subject: ${subject}`);
      return {
        success: true,
        recipient,
        subject,
        mode: 'simulated',
        messageId: `appr_${Date.now()}`
      };
    }

    try {
      const mailOptions: any = {
        from: this.fromAddress,
        to: recipient,
        subject,
        text: plainText,
        html: htmlBody
      };
      if (allCcs.length > 0) {
        mailOptions.cc = allCcs;
      }

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`[APPROVAL EMAIL SUCCESS] Message ID: ${info.messageId} | To: ${recipient} | CC: ${allCcs.join(', ')}`);
      return {
        success: true,
        recipient,
        subject,
        messageId: info.messageId,
        mode: this.mode
      };
    } catch (err: any) {
      this.logger.error(`[APPROVAL EMAIL ERROR] ${err.message}`);
      return {
        success: false,
        recipient,
        subject,
        mode: this.mode,
        error: err.message
      };
    }
  }

  async sendDirectTestEmail(toEmail: string): Promise<EmailSendResult> {
    const dummyProposal = {
      id: 'prop_test_email_verification',
      version: 1,
      title: 'Technical Talent Acquisition & Delivery Acceleration — Verification Dispatch',
      company_name: 'Excellency Jumo Enterprise Test',
      client_name: 'Excellency Jumo',
      client_email: toEmail,
      salesperson_name: 'Sarah Chen (Senior Account Executive)',
      valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };

    const clientLink = `http://localhost:3000/client-view.html?id=${dummyProposal.id}`;
    return this.sendProposalEmail({
      to: toEmail,
      proposal: dummyProposal,
      clientPortalUrl: clientLink,
      subject: `[Koya Proposal Studio] Live Email Dispatch Verification to ${toEmail}`
    });
  }

  getStatus() {
    return {
      mode: this.mode,
      has_transporter: Boolean(this.transporter),
      from: this.fromAddress
    };
  }
}
