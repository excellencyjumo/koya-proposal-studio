import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, KeyRound, AlertCircle, X, ShieldCheck } from 'lucide-react';

export const LoginModal: React.FC = () => {
  const { isLoginModalOpen, closeLoginModal, login, demoMode, credentialsHint } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isLoginModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const fillCredentials = (role: 'sales' | 'manager' | 'manager2') => {
    if (role === 'sales') {
      setEmail(credentialsHint?.sales?.email || 'sarah.chen@koyatalent.com');
      setPassword(credentialsHint?.sales?.password || 'Password123!');
    } else if (role === 'manager2') {
      setEmail(credentialsHint?.manager2?.email || 'elena.rostova@koyatalent.com');
      setPassword(credentialsHint?.manager2?.password || 'AdminPassword123!');
    } else {
      setEmail(credentialsHint?.manager?.email || 'marcus.vance@koyatalent.com');
      setPassword(credentialsHint?.manager?.password || 'AdminPassword123!');
    }
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm dark:bg-black/75 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 dark:bg-[#0f172a] dark:border-slate-800 rounded-2xl max-w-md w-full p-6 lg:p-8 shadow-2xl relative space-y-6 animate-fade-in transition-colors">
        <button
          onClick={closeLoginModal}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-1">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 mx-auto flex items-center justify-center font-bold shadow-xs transition-colors">
            <Lock className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Sign In</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Authenticate to verify roles for governance compliance and proposal sign-off.
          </p>
        </div>

        {/* Quick Fill Helpers in Demo Mode */}
        {demoMode && (
          <div className="p-3 bg-slate-50 border border-slate-200 dark:bg-slate-900/60 dark:border-slate-800 rounded-xl space-y-2">
            <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
              <span>Demo Accounts (Click to Fill):</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => fillCredentials('sales')}
                className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700 font-medium text-left shadow-2xs transition-colors"
              >
                <div className="font-bold text-[10px] truncate">Sarah Chen</div>
                <div className="text-[9px] text-slate-500 dark:text-slate-400">Sales Rep</div>
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('manager')}
                className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700 font-medium text-left shadow-2xs transition-colors"
              >
                <div className="font-bold text-[10px] truncate">Marcus Vance</div>
                <div className="text-[9px] text-slate-500 dark:text-slate-400">Manager 1</div>
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('manager2')}
                className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700 font-medium text-left shadow-2xs transition-colors"
              >
                <div className="font-bold text-[10px] truncate">Elena Rostova</div>
                <div className="text-[9px] text-slate-500 dark:text-slate-400">Manager 2</div>
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 dark:bg-rose-950/50 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 dark:bg-slate-900 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-slate-900 dark:focus:border-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Password
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 dark:bg-slate-900 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-slate-900 dark:focus:border-slate-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-semibold text-sm rounded-lg shadow-xs transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Signing In...' : 'Sign In to Workspace'}
          </button>
        </form>
      </div>
    </div>
  );
};
