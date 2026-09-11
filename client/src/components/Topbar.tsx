import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Proposal } from '../types';
import { 
  Building2, 
  ShieldCheck, 
  FileText, 
  History, 
  User as UserIcon, 
  LogOut, 
  LogIn, 
  ExternalLink,
  CheckCircle2,
  Clock,
  FileCheck2,
  Plus,
  LayoutDashboard,
  Sun,
  Moon,
  ChevronDown,
  SlidersHorizontal,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Lock
} from 'lucide-react';

const SlackIcon: React.FC<{ className?: string }> = ({ className = "w-3.5 h-3.5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
  </svg>
);

interface TopbarProps {
  currentProposal: Proposal | null;
  onOpenNewProposal: () => void;
  onOpenAudit: () => void;
  onOpenSlack: () => void;
  onToggleClientView: () => void;
  onGoToDashboard: () => void;
  onNavigateProposal?: (direction: 'prev' | 'next') => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  isClientView: boolean;
}

export const Topbar: React.FC<TopbarProps> = ({
  currentProposal,
  onOpenNewProposal,
  onOpenAudit,
  onOpenSlack,
  onToggleClientView,
  onGoToDashboard,
  onNavigateProposal,
  hasPrev = false,
  hasNext = false,
  isClientView
}) => {
  const { user, logout, openLoginModal } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [toolsOpen, setToolsOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);

  // Close tools dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toolsRef.current && !toolsRef.current.contains(event.target as Node)) {
        setToolsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200 dark:bg-[#090d16] dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs transition-colors duration-200">
      
      {/* Left: Brand & Clean Breadcrumb Navigation */}
      <div className="flex items-center gap-3">
        <button 
          onClick={onGoToDashboard}
          className="flex items-center gap-2.5 text-left focus:outline-none group"
        >
          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center font-bold text-sm shadow-xs transition-colors">
            K
          </div>
          <div>
            <span className="font-bold text-slate-900 dark:text-white text-sm tracking-tight group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
              Koya Studio
            </span>
          </div>
        </button>

        {currentProposal && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800 text-xs">
            <button
              onClick={onGoToDashboard}
              className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-medium flex items-center gap-1 transition-colors"
              title="Return to all proposals"
            >
              <ArrowLeft className="w-3 h-3" />
              <span className="hidden sm:inline">Proposals</span>
            </button>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="font-bold text-slate-900 dark:text-white max-w-[160px] sm:max-w-[200px] truncate">
              {currentProposal.company_name}
            </span>
          </div>
        )}
      </div>

      {/* Center: Contextual View Title & Status Pill */}
      {currentProposal ? (
        <div className="hidden md:flex items-center gap-2.5">
          {onNavigateProposal && (hasPrev || hasNext) && (
            <div className="flex items-center gap-0.5 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5 bg-slate-50 dark:bg-slate-900">
              <button
                onClick={() => onNavigateProposal('prev')}
                disabled={!hasPrev}
                className="p-1 rounded text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Previous Proposal"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onNavigateProposal('next')}
                disabled={!hasNext}
                className="p-1 rounded text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Next Proposal"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/80 text-xs font-semibold transition-colors">
            {currentProposal.status === 'draft' && (
              <>
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                <span className="text-slate-700 dark:text-slate-300">Draft (v{currentProposal.version})</span>
              </>
            )}
            {currentProposal.status === 'pending_approval' && (
              <>
                <span className="w-2 h-2 rounded-full bg-slate-500 dark:bg-slate-400"></span>
                <span className="text-slate-800 dark:text-slate-200">Under Review</span>
              </>
            )}
            {currentProposal.status === 'changes_requested' && (
              <>
                <span className="w-2 h-2 rounded-full bg-slate-500 dark:bg-slate-400"></span>
                <span className="text-slate-800 dark:text-slate-200">Changes Requested</span>
              </>
            )}
            {currentProposal.status === 'revision_requested' && (
              <>
                <span className="w-2 h-2 rounded-full bg-slate-600 dark:bg-slate-300 animate-pulse"></span>
                <span className="text-slate-900 dark:text-slate-100 font-bold">Client Revision Pending</span>
              </>
            )}

            {currentProposal.status === 'approved' && (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                <span className="text-emerald-800 dark:text-emerald-300">Approved</span>
              </>
            )}
            {currentProposal.status === 'delivered' && (
              <>
                <Lock className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                <span className="text-slate-900 dark:text-slate-100">Delivered & Locked</span>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="hidden md:block">
          <span className="font-bold text-slate-900 dark:text-white text-sm tracking-tight">
            Proposals Directory
          </span>
        </div>
      )}

      {/* Right: Only Essentials — New Proposal, Dashboard, Tools Dropdown, Theme Toggle, User */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        
        {/* Primary Action: + New Proposal */}
        <button
          onClick={onOpenNewProposal}
          className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-semibold text-xs shadow-xs flex items-center gap-1.5 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Proposal</span>
        </button>

        {/* Return to Dashboard (if viewing a proposal) */}
        {currentProposal && (
          <button
            onClick={onGoToDashboard}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
            title="All Proposals"
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span className="hidden lg:inline">Dashboard</span>
          </button>
        )}

        {/* Tools Dropdown: Groups Client View, Audit Log, Slack Preview */}
        <div className="relative" ref={toolsRef}>
          <button
            onClick={() => setToolsOpen(!toolsOpen)}
            className="px-2.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-300 font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
            title="Governance & Integration Tools"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span className="hidden md:inline">Tools</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {toolsOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1.5 z-50 text-xs animate-in fade-in slide-in-from-top-1">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/80 mb-1">
                Governance & Delivery
              </div>

              {currentProposal && (
                <button
                  onClick={() => {
                    onToggleClientView();
                    setToolsOpen(false);
                  }}
                  className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/80 flex items-center gap-2.5 transition-colors"
                >
                  <ExternalLink className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <div>
                    <div className="font-semibold">{isClientView ? 'Close Client View' : 'Client Portal View'}</div>
                    <div className="text-[10px] text-slate-400">Sanitized client-facing preview</div>
                  </div>
                </button>
              )}

              <button
                onClick={() => {
                  onOpenAudit();
                  setToolsOpen(false);
                }}
                className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/80 flex items-center gap-2.5 transition-colors"
              >
                <History className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <div>
                  <div className="font-semibold">Audit Trail & Hashes</div>
                  <div className="text-[10px] text-slate-400">Immutable governance logs</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Theme Switcher */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white transition-colors shadow-2xs"
          title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Black Mode"}
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700" />
          )}
        </button>

        <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-0.5" />

        {/* User Pill / Switcher */}
        {user ? (
          <div className="flex items-center gap-1.5">
            <button 
              onClick={openLoginModal}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-slate-800/80 text-left transition-colors shadow-2xs"
              title="Click to switch active role"
            >
              <div className="w-6 h-6 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center font-bold text-xs">
                {user.name.charAt(0)}
              </div>
              <div className="hidden lg:block">
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-none">{user.name}</div>
                <div className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 mt-0.5">{user.role}</div>
              </div>
            </button>
            <button
              onClick={logout}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={openLoginModal}
            className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-semibold text-xs flex items-center gap-1.5 transition-colors"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};
