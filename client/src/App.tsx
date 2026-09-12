import React, { useState, useEffect } from 'react';
import { Proposal, AuditLog, SlackDispatchResult } from './types';
import { api } from './services/api';
import { useAuth } from './context/AuthContext';
import { Topbar } from './components/Topbar';
import { ProposalDashboard } from './components/ProposalDashboard';
import { IntakeModal } from './components/IntakeModal';
import { DocumentView } from './components/DocumentView';
import { AuditDrawer } from './components/AuditDrawer';
import { SlackModal } from './components/SlackModal';
import { LoginModal } from './components/LoginModal';
import { ClientView } from './components/ClientView';
import { LoggedOutView } from './components/LoggedOutView';
import { AlertCircle, CheckCircle2, Bug } from 'lucide-react';

export const App: React.FC = () => {
  const { user, demoMode } = useAuth();

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [currentProposal, setCurrentProposal] = useState<Proposal | null>(null);
  const [currentSection, setCurrentSection] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const [isIntakeOpen, setIsIntakeOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isSlackOpen, setIsSlackOpen] = useState(false);
  const [isClientView, setIsClientView] = useState(false);
  const [lastSlackDispatch, setLastSlackDispatch] = useState<SlackDispatchResult | null>(null);

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadProposals = async () => {
    if (!user) {
      setProposals([]);
      return;
    }
    try {
      const res = await api.getProposals();
      setProposals(res.proposals || []);
    } catch (err: any) {
      console.error('Failed to load proposals:', err);
      setProposals([]);
    }
  };

  // Strictly synchronize in-memory proposal data with authentication state
  useEffect(() => {
    if (user) {
      loadProposals();
    } else {
      // User is logged out: Immediately wipe all proposals and active proposal from memory
      setProposals([]);
      setCurrentProposal(null);
      setCurrentSection(null);
      setAuditLogs([]);
      setIsIntakeOpen(false);
      setIsAuditOpen(false);
      setIsSlackOpen(false);

      // Clean URL if currently viewing internal proposals or intake
      if (window.location.pathname.startsWith('/proposals/') || window.location.pathname === '/new') {
        window.history.pushState({}, '', '/');
      }
    }
  }, [user]);

  const selectProposal = async (id: string, sectionKey: string | null = null, pushUrl = true) => {
    try {
      const res = await api.getProposal(id);
      setCurrentProposal(res.proposal);
      setCurrentSection(sectionKey);
      setAuditLogs(res.audit_logs || []);
      if (pushUrl) {
        const url = sectionKey ? `/proposals/${id}?section=${sectionKey}` : `/proposals/${id}`;
        window.history.pushState({ proposalId: id, sectionKey }, '', url);
      }
    } catch (err: any) {
      showNotification(`Error loading proposal: ${err.message}`, 'error');
    }
  };

  const handleSectionChange = (sectionKey: string | null) => {
    setCurrentSection(sectionKey);
    if (!currentProposal) return;
    const url = sectionKey ? `/proposals/${currentProposal.id}?section=${sectionKey}` : `/proposals/${currentProposal.id}`;
    window.history.pushState({ proposalId: currentProposal.id, sectionKey }, '', url);
  };

  const handleGoToDashboard = () => {
    setCurrentProposal(null);
    setCurrentSection(null);
    setIsClientView(false);
    setIsIntakeOpen(false);
    window.history.pushState({}, '', '/');
  };

  const handleOpenNewProposal = () => {
    if (!user) {
      showNotification('Please sign in to create a proposal.', 'error');
      return;
    }
    setIsIntakeOpen(true);
    window.history.pushState({ newProposal: true }, '', '/new');
  };

  const handleCloseNewProposal = () => {
    setIsIntakeOpen(false);
    if (currentProposal) {
      const url = currentSection ? `/proposals/${currentProposal.id}?section=${currentSection}` : `/proposals/${currentProposal.id}`;
      window.history.pushState({ proposalId: currentProposal.id, sectionKey: currentSection }, '', url);
    } else {
      window.history.pushState({}, '', '/');
    }
  };

  const handleToggleClientView = () => {
    if (!currentProposal) return;
    const nextState = !isClientView;
    setIsClientView(nextState);
    if (nextState) {
      window.history.pushState({ clientView: true }, '', `/client-view/${currentProposal.id}`);
    } else {
      const url = currentSection ? `/proposals/${currentProposal.id}?section=${currentSection}` : `/proposals/${currentProposal.id}`;
      window.history.pushState({ proposalId: currentProposal.id, sectionKey: currentSection }, '', url);
    }
  };

  // Next / Previous Proposal switcher
  const currentIdx = proposals.findIndex(p => p.id === currentProposal?.id);
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx >= 0 && currentIdx < proposals.length - 1;

  const handleNavigateProposal = (direction: 'prev' | 'next') => {
    if (currentIdx === -1) return;
    if (direction === 'prev' && hasPrev) {
      selectProposal(proposals[currentIdx - 1].id, null, true);
    } else if (direction === 'next' && hasNext) {
      selectProposal(proposals[currentIdx + 1].id, null, true);
    }
  };

  useEffect(() => {
    const initApp = async () => {
      // Parse initial URL
      const path = window.location.pathname;
      const hash = window.location.hash;
      const params = new URLSearchParams(window.location.search);
      const section = params.get('section');

      if (path.startsWith('/client-view/')) {
        const id = path.replace('/client-view/', '').trim();
        if (id) {
          await selectProposal(id, null, false);
          setIsClientView(true);
        }
        return;
      }

      if (user) {
        await loadProposals();

        if (path === '/new') {
          setIsIntakeOpen(true);
        } else if (path.startsWith('/proposals/')) {
          const id = path.replace('/proposals/', '').trim();
          if (id) selectProposal(id, section, false);
        } else if (hash.startsWith('#proposal-')) {
          const id = hash.replace('#proposal-', '').trim();
          if (id) selectProposal(id, section, false);
        }
      }
    };

    initApp();

    const handlePopState = (e: PopStateEvent) => {
      const path = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      const section = params.get('section');

      if (path.startsWith('/client-view/')) {
        setIsIntakeOpen(false);
        const id = path.replace('/client-view/', '').trim();
        if (id) {
          selectProposal(id, null, false);
          setIsClientView(true);
        }
        return;
      }

      setIsClientView(false);

      if (!user) {
        setIsIntakeOpen(false);
        setCurrentProposal(null);
        setCurrentSection(null);
        return;
      }

      if (path === '/new') {
        setIsIntakeOpen(true);
      } else if (path.startsWith('/proposals/')) {
        setIsIntakeOpen(false);
        const id = path.replace('/proposals/', '').trim();
        if (id) {
          selectProposal(id, section, false);
        }
      } else {
        setIsIntakeOpen(false);
        setCurrentProposal(null);
        setCurrentSection(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleGenerate = async (intakeData: Record<string, any>, supportingMaterial: string) => {
    setIsGenerating(true);
    try {
      const res = await api.generateProposal(intakeData, supportingMaterial);
      setCurrentProposal(res.proposal);
      await loadProposals();
      await selectProposal(res.proposal.id);

      if (res.idempotent_replay) {
        showNotification('Returned cached proposal from zero-token idempotency index.', 'info');
      } else {
        showNotification('Proposal successfully generated with 7 PRD sections!', 'success');
      }
    } catch (err: any) {
      showNotification(`Generation failed: ${err.message}`, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateSection = async (sectionKey: string, content: string) => {
    if (!currentProposal) return;
    setIsProcessing(true);
    try {
      const res = await api.updateSection(currentProposal.id, sectionKey, content, user?.name);
      setCurrentProposal(res.proposal);
      await selectProposal(currentProposal.id);
      showNotification(`Section "${sectionKey.replace('_', ' ')}" updated (v${res.proposal.version}).`, 'success');
    } catch (err: any) {
      showNotification(`Failed to update section: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRegenerateSection = async (sectionKey: string, instruction: string) => {
    if (!currentProposal) return;
    setIsProcessing(true);
    try {
      const res = await api.regenerateSection(currentProposal.id, sectionKey, instruction, user?.name);
      setCurrentProposal(res.proposal);
      await selectProposal(currentProposal.id);
      showNotification(`Section "${sectionKey.replace('_', ' ')}" regenerated by Claude Haiku!`, 'success');
    } catch (err: any) {
      showNotification(`Section regeneration failed: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmitForApproval = async () => {
    if (!currentProposal) return;
    setIsProcessing(true);
    try {
      const res = await api.submitForApproval(currentProposal.id, user?.name);
      setCurrentProposal(res.proposal);
      setLastSlackDispatch(res.slack_dispatch);
      await selectProposal(currentProposal.id);
      showNotification('Submitted for Manager sign-off. Slack notification dispatched!', 'success');
      setIsSlackOpen(true);
    } catch (err: any) {
      showNotification(`Submission error: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApprove = async (notes: string) => {
    if (!currentProposal) return;
    setIsProcessing(true);
    try {
      const res = await api.approveProposal(currentProposal.id, notes);
      setCurrentProposal(res.proposal);
      await selectProposal(currentProposal.id);
      showNotification(`Proposal approved by ${res.approved_by}! Client delivery unlocked.`, 'success');
    } catch (err: any) {
      showNotification(`Approval blocked: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRequestChanges = async (notes: string) => {
    if (!currentProposal) return;
    setIsProcessing(true);
    try {
      const res = await api.requestChanges(currentProposal.id, notes);
      setCurrentProposal(res.proposal);
      await selectProposal(currentProposal.id);
      showNotification('Changes requested. Sales rep notified.', 'info');
    } catch (err: any) {
      showNotification(`Error requesting changes: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeliver = async (email?: string) => {
    if (!currentProposal) return;
    setIsProcessing(true);
    try {
      const res = await api.deliverProposal(currentProposal.id, email);
      setCurrentProposal(res.proposal);
      await selectProposal(currentProposal.id);
      showNotification(`Proposal successfully delivered to ${res.delivery_details?.recipient}!`, 'success');
    } catch (err: any) {
      showNotification(`Delivery failed: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSimulateFault = async (faultType: string) => {
    if (!currentProposal) return;
    setIsProcessing(true);
    try {
      await api.simulateFailure(currentProposal.id, faultType);
      await selectProposal(currentProposal.id, currentSection, false);
      setIsAuditOpen(true);
      showNotification('Injected Claude fault caught and logged to audit trail (HTTP 502).', 'info');
    } catch (err: any) {
      await selectProposal(currentProposal.id, currentSection, false);
      setIsAuditOpen(true);
      showNotification(`Captured fault: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRequestClientRevision = async (feedback: string) => {
    if (!currentProposal) return;
    setIsProcessing(true);
    try {
      const res = await api.requestClientRevision(currentProposal.id, feedback, user?.name);
      setCurrentProposal(res.proposal);
      await selectProposal(currentProposal.id, currentSection, false);
      showNotification('Client revision requested. Sales manager notified via Slack to authorize unlock.', 'info');
    } catch (err: any) {
      showNotification(`Revision request failed: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApproveRevisionUnlock = async (notes: string) => {
    if (!currentProposal) return;
    setIsProcessing(true);
    try {
      const res = await api.approveRevisionUnlock(currentProposal.id, notes);
      setCurrentProposal(res.proposal);
      await selectProposal(currentProposal.id, currentSection, false);
      showNotification('Manager authorized unlock: Proposal reverted to draft for edits.', 'success');
    } catch (err: any) {
      showNotification(`Unlock authorization failed: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isClientView && currentProposal) {
    return (
      <ClientView
        proposal={currentProposal}
        onBack={() => {
          setIsClientView(false);
          window.history.pushState({}, '', '/');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#090d16] dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      <Topbar
        currentProposal={currentProposal}
        onOpenNewProposal={handleOpenNewProposal}
        onOpenAudit={() => setIsAuditOpen(true)}
        onOpenSlack={() => setIsSlackOpen(true)}
        onToggleClientView={handleToggleClientView}
        onGoToDashboard={handleGoToDashboard}
        isClientView={isClientView}
      />

      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-20 right-6 z-50 animate-fade-in">
          <div className={`px-4 py-3 rounded-xl border shadow-lg flex items-center gap-2.5 text-xs font-semibold ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/90 dark:text-emerald-200 dark:border-emerald-800'
              : notification.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/90 dark:text-rose-200 dark:border-rose-800'
              : 'bg-white text-slate-800 border-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-800'
          }`}>
            {notification.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
            {notification.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Main Content Area: Dashboard, Proposal Document Sheet, or LoggedOut Screen */}
      <main className="flex-1 flex overflow-hidden">
        {!user ? (
          <LoggedOutView />
        ) : currentProposal ? (
          <DocumentView
            proposal={currentProposal}
            initialSection={currentSection}
            onSectionChange={handleSectionChange}
            onUpdateSection={handleUpdateSection}
            onRegenerateSection={handleRegenerateSection}
            onSubmitForApproval={handleSubmitForApproval}
            onApprove={handleApprove}
            onRequestChanges={handleRequestChanges}
            onDeliver={handleDeliver}
            onRequestClientRevision={handleRequestClientRevision}
            onApproveRevisionUnlock={handleApproveRevisionUnlock}
            onSimulateFault={handleSimulateFault}
            isProcessing={isProcessing}
          />
        ) : (
          <ProposalDashboard
            proposals={proposals}
            onSelectProposal={(id) => selectProposal(id, null, true)}
            onOpenNewProposal={handleOpenNewProposal}
          />
        )}
      </main>

      {/* Enterprise Minimal Footer */}
      <footer className="bg-white border-t border-slate-200 dark:bg-[#090d16] dark:border-slate-800 px-6 py-3.5 flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 transition-colors">
        <div className="flex items-center gap-2">
          <span>&copy; 2026 Koya Talent Inc. All rights reserved.</span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span>Enterprise Proposal Governance</span>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            System Status: Operational
          </span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span>Dual Sign-Off Protocol Active</span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span>Supabase Cloud Sync</span>

          {demoMode && user && currentProposal && (
            <>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <button
                type="button"
                onClick={() => handleSimulateFault('claude_timeout')}
                className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 font-mono text-[11px] flex items-center gap-1 transition-colors"
                title="Inject simulated Claude fault (502) for grading verification"
              >
                <Bug className="w-3 h-3" />
                <span>Simulate Fault (502)</span>
              </button>
            </>
          )}
        </div>
      </footer>

      {/* Modals & Drawers (Exclusively rendered when authenticated) */}
      {user && (
        <>
          <IntakeModal
            isOpen={isIntakeOpen}
            onClose={handleCloseNewProposal}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            activeGaps={currentProposal?.gaps}
          />

          <AuditDrawer
            isOpen={isAuditOpen}
            onClose={() => setIsAuditOpen(false)}
            auditLogs={auditLogs}
            proposalId={currentProposal?.id}
          />

          <SlackModal
            isOpen={isSlackOpen}
            onClose={() => setIsSlackOpen(false)}
            proposal={currentProposal}
            lastDispatch={lastSlackDispatch}
          />
        </>
      )}

      <LoginModal />
    </div>
  );
};
