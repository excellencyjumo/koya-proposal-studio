import React, { useState } from 'react';
import { Proposal } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldCheck, 
  Send, 
  CheckCircle2, 
  XCircle, 
  Mail, 
  Download, 
  AlertTriangle, 
  Bug,
  Lock,
  MessageSquare
} from 'lucide-react';

interface ApprovalPanelProps {
  proposal: Proposal;
  onSubmitForApproval: () => Promise<void>;
  onApprove: (notes: string) => Promise<void>;
  onRequestChanges: (notes: string) => Promise<void>;
  onDeliver: (email?: string) => Promise<void>;
  onSimulateFault: (faultType: string) => Promise<void>;
  isProcessing: boolean;
}

export const ApprovalPanel: React.FC<ApprovalPanelProps> = ({
  proposal,
  onSubmitForApproval,
  onApprove,
  onRequestChanges,
  onDeliver,
  onSimulateFault,
  isProcessing
}) => {
  const { user, demoMode } = useAuth();
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [targetEmail, setTargetEmail] = useState(proposal.client_email);

  const isSales = user?.role === 'sales';
  const isManager = user?.role === 'manager';
  const isCreator = user?.id && proposal.created_by_user_id && user.id === proposal.created_by_user_id;

  const isApproved = proposal.status === 'approved';
  const isDelivered = proposal.status === 'delivered';
  const isPending = proposal.status === 'pending_approval';

  const handleDownloadEml = () => {
    window.open(`/api/proposals/${proposal.id}/export-eml`, '_blank');
  };

  return (
    <div className="bg-[#0c111d] border-t border-slate-800/80 px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky bottom-0 z-20 shadow-2xl">
      {/* Left: Governance Status Message */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Governance & Delivery Pipeline
            </span>
            {isApproved && (
              <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800 text-emerald-300 font-mono text-[10px] font-semibold">
                Manager Signed Off
              </span>
            )}
            {isDelivered && (
              <span className="px-2 py-0.5 rounded bg-blue-950/80 border border-blue-800 text-blue-300 font-mono text-[10px] font-semibold">
                Delivered
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400">
            {isApproved ? (
              <span>Approved by <strong className="text-slate-300">{proposal.approval?.approved_by || 'Management'}</strong>. Ready for client delivery.</span>
            ) : isPending ? (
              <span>Proposal submitted. Awaiting manager review and sign-off.</span>
            ) : isSales ? (
              <span>Peer Review Protocol: As Sales Rep, submit to manager for sign-off. Approval buttons are restricted to managers.</span>
            ) : (
              <span>Review 7 sections and sign off to unlock client delivery and RFC 822 email export.</span>
            )}
          </p>
        </div>
      </div>

      {/* Right: Role-Based Action Controls */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Sales Rep View: Can only Submit for Approval */}
        {isSales && !isApproved && !isDelivered && (
          <button
            type="button"
            onClick={onSubmitForApproval}
            disabled={isProcessing}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isPending ? 'Re-Submit for Manager Review' : 'Submit for Manager Review'}</span>
          </button>
        )}

        {/* Sales Manager View: Can Approve or Request Changes (unless creator) */}
        {isManager && !isApproved && !isDelivered && (
          <>
            {isCreator ? (
              <div className="px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-700 text-slate-300 text-xs flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />
                <span>Dual Sign-Off Required: You authored this proposal. Another manager must approve.</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Manager review feedback notes..."
                  value={feedbackNotes}
                  onChange={(e) => setFeedbackNotes(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 text-xs w-56 focus:outline-none focus:border-slate-400"
                />
                <button
                  type="button"
                  onClick={() => onRequestChanges(feedbackNotes)}
                  disabled={isProcessing}
                  className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <XCircle className="w-3.5 h-3.5 text-slate-400" />
                  <span>Request Changes</span>
                </button>

                <button
                  type="button"
                  onClick={() => onApprove(feedbackNotes)}
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Approve & Sign Off</span>
                </button>
              </div>
            )}
          </>
        )}

        {/* Approved Actions: Deliver Proposal & Export EML */}
        {isApproved && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadEml}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Download raw RFC 822 .eml file"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export RFC 822 (.eml)</span>
            </button>

            {!isDelivered ? (
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={targetEmail}
                  onChange={(e) => setTargetEmail(e.target.value)}
                  placeholder="client@company.com"
                  className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 text-xs w-48 font-mono focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => onDeliver(targetEmail)}
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Deliver to Client</span>
                </button>
              </div>
            ) : (
              <div className="px-3 py-1.5 rounded-lg bg-blue-950/60 border border-blue-800/80 text-blue-300 text-xs font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Delivered to {proposal.delivery?.client_email || proposal.client_email}</span>
              </div>
            )}
          </div>
        )}

        {/* Demo Mode Fault Injector */}
        {demoMode && (
          <button
            type="button"
            onClick={() => onSimulateFault('claude_timeout')}
            disabled={isProcessing}
            className="px-2.5 py-2 rounded-lg bg-rose-950/40 border border-rose-900/60 hover:bg-rose-900/50 text-rose-300 text-xs font-mono flex items-center gap-1.5 transition-colors ml-2"
            title="Inject simulated Claude timeout fault to verify error drawer and audit logging"
          >
            <Bug className="w-3.5 h-3.5" />
            <span>Simulate Fault (502)</span>
          </button>
        )}
      </div>
    </div>
  );
};
