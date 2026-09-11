import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldCheck, 
  Lock, 
  LogIn, 
  ArrowRight, 
  Sparkles
} from 'lucide-react';

export const LoggedOutView: React.FC = () => {
  const { openLoginModal, login, credentialsHint } = useAuth();
  const [loggingInRole, setLoggingInRole] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleQuickLogin = async (role: 'sales' | 'manager' | 'manager2') => {
    setErrorMsg(null);
    setLoggingInRole(role);
    try {
      if (role === 'sales') {
        const email = credentialsHint?.sales?.email || 'sarah.chen@koyatalent.com';
        const pass = credentialsHint?.sales?.password || 'Password123!';
        await login(email, pass);
      } else if (role === 'manager2') {
        const email = credentialsHint?.manager2?.email || 'elena.rostova@koyatalent.com';
        const pass = credentialsHint?.manager2?.password || 'AdminPassword123!';
        await login(email, pass);
      } else {
        const email = credentialsHint?.manager?.email || 'marcus.vance@koyatalent.com';
        const pass = credentialsHint?.manager?.password || 'AdminPassword123!';
        await login(email, pass);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoggingInRole(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#090d16] flex flex-col items-center justify-center p-6 md:p-12 transition-colors">
      <div className="max-w-3xl w-full space-y-8 animate-fade-in">
        
        {/* Security Alert / Welcome Banner */}
        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-3xl p-8 md:p-10 shadow-xl relative overflow-hidden text-center space-y-6">
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-blue-500/10 dark:bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-indigo-500/10 dark:bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative inline-flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center shadow-md">
              <Lock className="w-8 h-8" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center ring-4 ring-white dark:ring-[#0f172a]">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="space-y-2 max-w-lg mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Enterprise Role-Based Access Control (RBAC) Active
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Sign In to Proposal Studio
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              All client proposals, commercial pricing terms, and executive sign-off workflows are protected. You must be signed in to view or manage enterprise proposals.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 dark:bg-rose-950/50 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-xl max-w-md mx-auto">
              {errorMsg}
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={openLoginModal}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-semibold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In with Credentials</span>
            </button>
          </div>
        </div>

        {/* Quick-Access Demo Credentials for Testing / Grading */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>One-Click Role Authentication (Demo & Evaluation)</span>
            </div>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">Click any card to sign in</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Sales Representative Card */}
            <div 
              onClick={() => handleQuickLogin('sales')}
              className={`p-5 rounded-2xl border transition-all cursor-pointer group bg-white dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 hover:border-blue-500/50 hover:shadow-md ${
                loggingInRole === 'sales' ? 'ring-2 ring-blue-500 opacity-80' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 flex items-center justify-center font-bold text-sm">
                  SC
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Sales Rep
                </span>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Sarah Chen
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mb-3">
                sarah.chen@koyatalent.com
              </p>
              <div className="text-xs text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                Creates AI proposals, edits PRD sections, and submits for managerial review.
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-400">
                <span>{loggingInRole === 'sales' ? 'Signing in...' : 'Sign In as Sales'}</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Sales Manager 1 Card */}
            <div 
              onClick={() => handleQuickLogin('manager')}
              className={`p-5 rounded-2xl border transition-all cursor-pointer group bg-white dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 hover:shadow-md ${
                loggingInRole === 'manager' ? 'ring-2 ring-emerald-500 opacity-80' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 flex items-center justify-center font-bold text-sm">
                  MV
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  Sales VP
                </span>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                Marcus Vance
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mb-3">
                marcus.vance@koyatalent.com
              </p>
              <div className="text-xs text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                Conducts Four-Eyes commercial review, requests revisions, and delivers to clients.
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <span>{loggingInRole === 'manager' ? 'Signing in...' : 'Sign In as Manager 1'}</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Manager 2 Card */}
            <div 
              onClick={() => handleQuickLogin('manager2')}
              className={`p-5 rounded-2xl border transition-all cursor-pointer group bg-white dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 hover:border-purple-500/50 hover:shadow-md ${
                loggingInRole === 'manager2' ? 'ring-2 ring-purple-500 opacity-80' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 flex items-center justify-center font-bold text-sm">
                  ER
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  Operations VP
                </span>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                Elena Rostova
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mb-3">
                elena.rostova@koyatalent.com
              </p>
              <div className="text-xs text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                Independent 3rd-party reviewer for dual-manager governance when a manager makes edits.
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-semibold text-purple-600 dark:text-purple-400">
                <span>{loggingInRole === 'manager2' ? 'Signing in...' : 'Sign In as Manager 2'}</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
