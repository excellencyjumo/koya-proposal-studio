import React, { useState } from 'react';
import { AuditLog } from '../types';
import { 
  History, 
  X, 
  Copy, 
  Check, 
  Clock, 
  User, 
  ChevronDown, 
  ChevronRight,
  Download 
} from 'lucide-react';

interface AuditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  auditLogs: AuditLog[];
  proposalId?: string;
}

export const AuditDrawer: React.FC<AuditDrawerProps> = ({
  isOpen,
  onClose,
  auditLogs,
  proposalId
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'created':
        return { label: 'Generated', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60' };
      case 'section_updated':
        return { label: 'Section Edited', bg: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700' };
      case 'section_regenerated':
        return { label: 'AI Regenerated', bg: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700' };
      case 'approval_requested':
        return { label: 'Review Requested', bg: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700' };
      case 'approved':
        return { label: 'Manager Approved', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60' };
      case 'changes_requested':
        return { label: 'Changes Requested', bg: 'bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700' };
      case 'client_revision_requested':
        return { label: 'Revision Requested', bg: 'bg-slate-100 text-slate-900 border-slate-400 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 font-bold' };
      case 'revision_unlocked_by_manager':
        return { label: 'Revision Unlocked', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60' };
      case 'delivered':
        return { label: 'Delivered', bg: 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-white' };
      case 'approval_revoked_tamper_guard':
        return { label: 'Tamper Guard Revocation', bg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800' };
      case 'proposal_accepted_by_client':
        return { label: 'Client Accepted & Signed', bg: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-700 font-bold' };
      case 'pricing_consistency_warning':
        return { label: 'Pricing Warning', bg: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700' };
      default:
        return { label: action.replace('_', ' '), bg: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' };
    }

  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs dark:bg-black/60 flex justify-end">
      <div className="w-full max-w-md bg-white border-l border-slate-200 dark:bg-[#0f172a] dark:border-slate-800 shadow-2xl flex flex-col h-full animate-slide-left transition-colors">
        
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <History className="w-5 h-5 text-slate-800 dark:text-slate-200" />
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Enterprise Audit Trail</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Immutable ledger of proposal lifecycle actions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Logs List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {auditLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs">
              No audit logs recorded for this proposal yet.
            </div>
          ) : (
            auditLogs.map((log) => {
              const badge = getActionBadge(log.action);
              const isExpanded = expandedLogId === log.id;
              const requestId = log.details?.request_id;

              return (
                <div
                  key={log.id}
                  className="bg-white border border-slate-200 dark:bg-slate-900/60 dark:border-slate-800 rounded-xl p-4 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border capitalize ${badge.bg}`}>
                      {badge.label}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" />
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold text-slate-900 dark:text-white">{log.actor}</span>
                  </div>

                  {/* Request ID Display with 1-click Copy */}
                  {requestId && (
                    <div className="flex items-center justify-between gap-2 p-1.5 bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded font-mono text-[10px] text-slate-600 dark:text-slate-400">
                      <span className="truncate">Trace: {requestId}</span>
                      <button
                        onClick={() => handleCopy(requestId, log.id)}
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition-colors flex-shrink-0"
                        title="Copy Request ID"
                      >
                        {copiedId === log.id ? (
                          <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  )}

                  {/* Expandable JSON details */}
                  {log.details && Object.keys(log.details).length > 0 && (
                    <div>
                      <button
                        type="button"
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 transition-colors"
                      >
                        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        <span>{isExpanded ? 'Hide Payload' : 'Inspect Details'}</span>
                      </button>

                      {isExpanded && (
                        <pre className="mt-2 p-2.5 bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded text-[10px] font-mono text-slate-700 dark:text-slate-300 overflow-x-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        {proposalId && (
          <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {auditLogs.length} immutable events recorded
            </span>
            <a
              href={`/api/proposals/${proposalId}/export-audit-csv`}
              download={`proposal-audit-${proposalId}.csv`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Audit CSV</span>
            </a>
          </div>
        )}

      </div>
    </div>
  );
};
