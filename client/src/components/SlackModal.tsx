import React from 'react';
import { Proposal, SlackDispatchResult } from '../types';
import { X } from 'lucide-react';

interface SlackModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposal: Proposal | null;
  lastDispatch: SlackDispatchResult | null;
}

export const SlackModal: React.FC<SlackModalProps> = ({
  isOpen,
  onClose,
  proposal
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm dark:bg-black/75 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 dark:bg-[#0f172a] dark:border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-fade-in transition-colors">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center font-bold">
              #
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Slack Notification Preview</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Channel: #general · Real-time Manager Alert</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Message Preview Only */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
          <div className="p-5 bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-xl space-y-3 font-sans text-xs">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center text-[10px] font-bold">
                K
              </div>
              <strong className="text-slate-900 dark:text-white">Koya Proposal Bot</strong>
              <span className="text-[10px] text-slate-400">APP • Just now</span>
            </div>

            <div className="pl-8 space-y-3">
              <div className="font-bold text-sm text-slate-900 dark:text-white">
                📄 New Proposal Ready for Review: {proposal?.title || 'Client Engagement'}
              </div>

              <div className="grid grid-cols-2 gap-3 p-3.5 bg-white border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-lg text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Client</span>
                  <strong className="text-slate-800 dark:text-slate-200">{proposal?.company_name || 'Acme'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Contact</span>
                  <strong className="text-slate-800 dark:text-slate-200">{proposal?.client_name || 'Contact'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Salesperson</span>
                  <strong className="text-slate-800 dark:text-slate-200">{proposal?.salesperson_name || 'Sarah Chen'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Pricing</span>
                  <strong className="text-slate-800 dark:text-slate-200">{proposal?.intake_data?.estimated_pricing || 'N/A'}</strong>
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 text-white font-semibold rounded-lg text-xs">
                  Review & Sign Off
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Delivered automatically to team Slack channel
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
