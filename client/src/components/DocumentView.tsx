import React, { useState, useEffect } from 'react';
import { Proposal } from '../types';
import { 
  Lock,
  FileCode2,
  Edit3, 
  Sparkles, 
  Check, 
  X, 
  FileText, 
  Hash, 
  DollarSign, 
  Calendar, 
  ShieldAlert, 
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Send,
  Download,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Copy,
  Layers,
  ChevronRight,
  Maximize2,
  BookOpen,
  Type,
  Unlock,
  RotateCcw,
  ExternalLink,
  RefreshCw,
  Clock,
  FileEdit
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface DocumentViewProps {
  proposal: Proposal;
  initialSection?: string | null;
  onSectionChange?: (sectionKey: string | null) => void;
  onUpdateSection: (sectionKey: string, content: string) => Promise<void>;
  onRegenerateSection: (sectionKey: string, instruction: string) => Promise<void>;
  onSubmitForApproval: () => Promise<void>;
  onApprove: (notes: string) => Promise<void>;
  onRequestChanges: (notes: string) => Promise<void>;
  onDeliver: (email?: string) => Promise<void>;
  onRequestClientRevision?: (feedback: string) => Promise<void>;
  onApproveRevisionUnlock?: (notes: string) => Promise<void>;
  onSimulateFault: (faultType: string) => Promise<void>;
  isProcessing: boolean;
}


const SECTION_CONFIG: { key: string; number: string; title: string; shortTitle: string; desc: string }[] = [
  {
    key: 'introduction',
    number: '1',
    title: 'Introduction',
    shortTitle: 'Introduction',
    desc: 'Executive greeting, problem context, and business alignment.'
  },
  {
    key: 'project_scope',
    number: '2',
    title: 'Project Scope',
    shortTitle: 'Scope',
    desc: 'Boundaries, technical targets, and strategic outcomes.'
  },
  {
    key: 'recommended_approach',
    number: '3',
    title: 'Recommended Approach',
    shortTitle: 'Approach',
    desc: 'Architecture, methodologies, and engineering workflows.'
  },
  {
    key: 'deliverables',
    number: '4',
    title: 'Deliverables',
    shortTitle: 'Deliverables',
    desc: 'Itemized tangible deliverables and talent roles.'
  },
  {
    key: 'timeline',
    number: '5',
    title: 'Timeline',
    shortTitle: 'Timeline',
    desc: 'Phased milestones, sprints, and review checkpoints.'
  },
  {
    key: 'pricing',
    number: '6',
    title: 'Pricing & Commercial Terms',
    shortTitle: 'Pricing',
    desc: 'Transparent milestone pricing, fees, and commercial terms.'
  },
  {
    key: 'next_steps',
    number: '7',
    title: 'Next Steps',
    shortTitle: 'Next Steps',
    desc: 'Engagement agreement sign-off and discovery onboarding.'
  }
];

function stripLeadingSectionTitle(rawText: string, sectionKey?: string): string {
  if (!rawText) return '';
  let text = rawText.trim();

  text = text.replace(/^```(?:json|markdown)?\s*/i, '').replace(/\s*```$/i, '').trim();

  const sectionKeywords = [
    'introduction',
    'project scope',
    'scope of work',
    'recommended approach',
    'technical approach',
    'deliverables',
    'key deliverables',
    'timeline',
    'project timeline',
    'pricing',
    'pricing & commercial terms',
    'commercial terms & pricing',
    'commercial terms',
    'next steps',
    'governance',
    'standard terms & conditions',
    'terms & conditions'
  ];

  const regex = new RegExp(
    `^(?:[#*_-]*\\s*)?(?:[1-7]\\.?\\s*)?(?:${sectionKeywords.join('|')})(?:[\\s:—–-]*[#*_-]*)*(?:\\r?\\n)+`,
    'i'
  );
  text = text.replace(regex, '').trim();

  const lines = text.split('\n');
  if (lines.length > 1) {
    const first = lines[0].trim();
    const normalized = first.toLowerCase().replace(/^[#*_\d.\s:—–-]+/, '').replace(/[#*_\s:—–-]+$/, '');
    if (
      sectionKeywords.includes(normalized) ||
      /^(?:#+\s*)?[1-7]\.\s+[A-Za-z\s&—–-]+$/i.test(first) ||
      (sectionKey && normalized === sectionKey.replace('_', ' '))
    ) {
      lines.shift();
      text = lines.join('\n').trim();
    }
  }

  return text;
}

function cleanSectionText(raw: string, sectionKey?: string): string {
  if (!raw || typeof raw !== 'string') return '';
  let text = raw.trim();

  // If content is wrapped in JSON codeblock or starts with json / {
  if (text.startsWith('```json') || text.startsWith('```') || text.startsWith('{')) {
    try {
      const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(stripped);
      if (parsed && typeof parsed === 'object') {
        if (sectionKey && parsed[sectionKey]) {
          return stripLeadingSectionTitle(String(parsed[sectionKey]), sectionKey);
        }
        if (parsed.introduction) return stripLeadingSectionTitle(String(parsed.introduction), sectionKey);
        if (parsed.project_scope) return stripLeadingSectionTitle(String(parsed.project_scope), sectionKey);
        if (parsed.content) return stripLeadingSectionTitle(String(parsed.content), sectionKey);
      }
    } catch {
      // Regex extraction fallback
      if (sectionKey) {
        const pattern = new RegExp(`"${sectionKey}"\\s*:\\s*"([\\s\\S]*?)"(?=\\s*,\\s*"|\\s*\\})`, 'i');
        const match = text.match(pattern);
        if (match && match[1]) {
          return stripLeadingSectionTitle(
            match[1]
              .replace(/\\n/g, '\n')
              .replace(/\\r/g, '')
              .replace(/\\"/g, '"')
              .replace(/\\\\/g, '\\')
              .trim(),
            sectionKey
          );
        }
      }
      const introMatch = text.match(/"introduction"\s*:\\s*"([\\s\\S]*?)"(?=\\s*,\\s*"|\\s*\\})/i);
      if (introMatch && introMatch[1] && (!sectionKey || sectionKey === 'introduction')) {
        return stripLeadingSectionTitle(
          introMatch[1]
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\')
            .trim(),
          sectionKey
        );
      }
    }
  }

  return stripLeadingSectionTitle(text, sectionKey);
}

function parseSectionItems(cleanedText: string): Array<{
  type: 'header' | 'bullet' | 'numbered' | 'paragraph';
  content: string;
  prefix?: string;
  number?: string;
}> {
  const items: Array<{
    type: 'header' | 'bullet' | 'numbered' | 'paragraph';
    content: string;
    prefix?: string;
    number?: string;
  }> = [];

  const rawLines = cleanedText.split(/\r?\n/);

  for (let rawLine of rawLines) {
    let line = rawLine.trim();
    if (!line) continue;

    // Clean stray markdown hashtags at start or end
    line = line.replace(/^[#]+\s*/, '').replace(/\s*[#]+$/, '');

    // Check if line is a clean section header
    if (/^[A-Z][A-Za-z0-9\s/&—–-]+:\s*$/.test(line) && line.length < 75) {
      items.push({ type: 'header', content: line.replace(/:\s*$/, '') });
      continue;
    }

    // Check if line starts with standard bullet
    if (/^[•\-*]\s+/.test(line)) {
      const text = line.replace(/^[•\-*]\s+/, '').trim();
      const colonIdx = text.indexOf(':');
      if (colonIdx > 0 && colonIdx < 45) {
        items.push({
          type: 'bullet',
          prefix: text.slice(0, colonIdx + 1),
          content: text.slice(colonIdx + 1).trim()
        });
      } else {
        items.push({ type: 'bullet', content: text });
      }
      continue;
    }

    // Check if line starts with numbered list (e.g. "1. " or "1) ")
    if (/^\d+[\.\)]\s+/.test(line)) {
      const match = line.match(/^(\d+[\.\)])\s+(.*)$/);
      const num = match ? match[1] : '';
      const text = match ? match[2].trim() : line;
      const colonIdx = text.indexOf(':');
      if (colonIdx > 0 && colonIdx < 45) {
        items.push({
          type: 'numbered',
          number: num,
          prefix: text.slice(0, colonIdx + 1),
          content: text.slice(colonIdx + 1).trim()
        });
      } else {
        items.push({ type: 'numbered', number: num, content: text });
      }
      continue;
    }

    // Unpack inline numbered points like "(1) ... (2) ... (3) ..."
    if (/\(\d+\)\s+/.test(line)) {
      const parts = line.split(/(?=\(\d+\)\s+)/);
      if (parts.length > 1) {
        const intro = parts[0].trim();
        if (intro) {
          items.push({ type: 'paragraph', content: intro });
        }
        for (let i = 1; i < parts.length; i++) {
          const itemMatch = parts[i].match(/^\((\d+)\)\s+(.*)$/);
          if (itemMatch) {
            const itemNum = `${itemMatch[1]}.`;
            let itemText = itemMatch[2].replace(/[;,]\s*$/, '').trim();
            const colonIdx = itemText.indexOf(':');
            if (colonIdx > 0 && colonIdx < 45) {
              items.push({
                type: 'numbered',
                number: itemNum,
                prefix: itemText.slice(0, colonIdx + 1),
                content: itemText.slice(colonIdx + 1).trim()
              });
            } else {
              items.push({ type: 'numbered', number: itemNum, content: itemText });
            }
          }
        }
        continue;
      }
    }

    // If paragraph has multiple sentences, break long walls of text into clean paragraphs
    const sentences = line.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g);
    if (sentences && sentences.length >= 4) {
      const mid = Math.ceil(sentences.length / 2);
      items.push({ type: 'paragraph', content: sentences.slice(0, mid).join(' ').trim() });
      items.push({ type: 'paragraph', content: sentences.slice(mid).join(' ').trim() });
    } else {
      items.push({ type: 'paragraph', content: line });
    }
  }

  return items;
}

function ProposalContentRenderer({
  content,
  sectionKey
}: {
  content: string;
  fontMode?: 'serif' | 'sans';
  sectionKey?: string;
}) {
  const cleaned = cleanSectionText(content, sectionKey);

  if (!cleaned) {
    return <span className="text-slate-600 dark:text-slate-400 italic">No content generated for this section.</span>;
  }

  const items = parseSectionItems(cleaned);
  const fontClass = 'proposal-text-sans';

  const renderTextWithPlaceholders = (text: string) => {
    if (!text) return null;

    // Split by [TO BE CONFIRMED...]
    const tbcRegex = /(\[TO BE CONFIRMED.*?\])/g;
    const parts = text.split(tbcRegex);

    return parts.map((part, pIdx) => {
      if (part.startsWith('[TO BE CONFIRMED')) {
        return (
          <span
            key={`tbc-${pIdx}`}
            className="inline-flex items-center mx-1 px-2 py-0.5 rounded font-mono font-bold text-xs border border-red-500 bg-red-50 text-red-700 dark:border-red-600 dark:bg-red-950/60 dark:text-red-300 shadow-2xs"
          >
            {part}
          </span>
        );
      }

      // Parse inline bold **text** and italic *text*
      const boldParts: React.ReactNode[] = [];
      const boldRegex = /\*\*([^*]+)\*\*/g;
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = boldRegex.exec(part)) !== null) {
        if (match.index > lastIndex) {
          boldParts.push(part.substring(lastIndex, match.index));
        }
        boldParts.push(
          <strong key={`bold-${pIdx}-${lastIndex}`} className="font-bold text-slate-950 dark:text-white">
            {match[1]}
          </strong>
        );
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < part.length) {
        boldParts.push(part.substring(lastIndex));
      }

      return <React.Fragment key={`p-${pIdx}`}>{boldParts}</React.Fragment>;
    });
  };

  return (
    <div className={`${fontClass} text-slate-900 dark:text-slate-100 space-y-3.5 leading-relaxed text-[13.5px] sm:text-sm`}>
      {items.map((item, idx) => {
        if (item.type === 'header') {
          return (
            <h3
              key={idx}
              className="pt-3 pb-1 font-sans font-bold text-slate-950 dark:text-white tracking-tight text-base sm:text-lg border-b border-slate-200 dark:border-slate-800"
            >
              {renderTextWithPlaceholders(item.content)}
            </h3>
          );
        }

        if (item.type === 'bullet') {
          return (
            <div key={idx} className="flex items-start gap-2.5 pl-2 my-1.5">
              <span className="text-slate-700 dark:text-slate-300 font-sans select-none text-base leading-snug font-bold">•</span>
              <div className="flex-1">
                {item.prefix && (
                  <strong className="font-sans font-bold text-slate-950 dark:text-white mr-1.5">
                    {renderTextWithPlaceholders(item.prefix)}
                  </strong>
                )}
                <span className="text-slate-900 dark:text-slate-100">{renderTextWithPlaceholders(item.content)}</span>
              </div>
            </div>
          );
        }

        if (item.type === 'numbered') {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2 my-1.5">
              <span className="font-mono font-bold text-xs text-slate-700 dark:text-slate-300 min-w-[22px] pt-0.5 select-none">
                {item.number}
              </span>
              <div className="flex-1">
                {item.prefix && (
                  <strong className="font-sans font-bold text-slate-950 dark:text-white mr-1.5">
                    {renderTextWithPlaceholders(item.prefix)}
                  </strong>
                )}
                <span className="text-slate-900 dark:text-slate-100">{renderTextWithPlaceholders(item.content)}</span>
              </div>
            </div>
          );
        }

        // Standard clean paragraph
        return (
          <p key={idx} className="text-slate-800 dark:text-slate-200 leading-relaxed">
            {renderTextWithPlaceholders(item.content)}
          </p>
        );
      })}
    </div>
  );
}

export const DocumentView: React.FC<DocumentViewProps> = ({
  proposal,
  initialSection,
  onSectionChange,
  onUpdateSection,
  onRegenerateSection,
  onSubmitForApproval,
  onApprove,
  onRequestChanges,
  onDeliver,
  onRequestClientRevision,
  onApproveRevisionUnlock,
  onSimulateFault,
  isProcessing
}) => {
  const { user } = useAuth();
  
  // Section Tab state: 'all' or one of the 7 section keys
  const [activeTab, setActiveTab] = useState<string>(initialSection || 'all');

  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [regenSection, setRegenSection] = useState<string | null>(null);
  const [regenInstruction, setRegenInstruction] = useState('');
  const [managerUnlockNotes, setManagerUnlockNotes] = useState('');
  const [clientFeedbackInput, setClientFeedbackInput] = useState('');
  const [selectedDiffVersion, setSelectedDiffVersion] = useState<number | null>(null);
  const [diffSectionKey, setDiffSectionKey] = useState<string>('introduction');

  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [targetEmail, setTargetEmail] = useState(proposal.client_email);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Quote Validity calculation (Days remaining based on 30-day window)
  const [isValidityModalOpen, setIsValidityModalOpen] = useState(false);
  const createdAtMs = new Date(proposal.created_at || proposal.date_of_call || Date.now()).getTime();
  const validUntilDate = proposal.valid_until 
    ? new Date(proposal.valid_until) 
    : new Date(createdAtMs + 30 * 86400000);
  const isQuoteExpired = Date.now() > validUntilDate.getTime();
  const remainingMs = Math.max(0, validUntilDate.getTime() - Date.now());
  const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));

  // Three-tier indicator according to user:
  // <= 5 days or expired: red
  // 6 to 21 days: orange
  // >= 22 days: green
  let validityTier: 'red' | 'orange' | 'green' = 'green';
  if (isQuoteExpired || remainingDays <= 5) {
    validityTier = 'red';
  } else if (remainingDays <= 21) {
    validityTier = 'orange';
  } else {
    validityTier = 'green';
  }
  const formattedExpiryDate = validUntilDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  useEffect(() => {
    if (initialSection) {
      setActiveTab(initialSection);
    }
  }, [initialSection]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (onSectionChange) {
      onSectionChange(tab === 'all' ? null : tab);
    }
  };

  const isSales = user?.role === 'sales';
  const isManager = user?.role === 'manager';
  const isCreator = user?.id && proposal.created_by_user_id && user.id === proposal.created_by_user_id;

  const isApproved = proposal.status === 'approved';
  const isDelivered = proposal.status === 'delivered';
  const isPending = proposal.status === 'pending_approval';
  const isRevisionRequested = proposal.status === 'revision_requested';
  const isAccepted = proposal.status === 'accepted';


  const handleStartEdit = (key: string, content: string) => {
    setEditingSection(key);
    setEditContent(content);
  };

  const handleCancelEdit = () => {
    setEditingSection(null);
    setEditContent('');
  };

  const handleSaveEdit = async (key: string) => {
    await onUpdateSection(key, editContent);
    setEditingSection(null);
  };

  const handleOpenRegen = (key: string) => {
    setRegenSection(key);
    setRegenInstruction('');
  };

  const handleConfirmRegen = async () => {
    if (!regenSection) return;
    await onRegenerateSection(regenSection, regenInstruction);
    setRegenSection(null);
    setRegenInstruction('');
  };

  const handleDownloadEml = () => {
    window.open(`/api/proposals/${proposal.id}/export-eml`, '_blank');
  };

  const handleCopySection = (key: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedSection(key);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const currentSectionIdx = SECTION_CONFIG.findIndex(s => s.key === activeTab);
  const currentSectionConfig = SECTION_CONFIG[currentSectionIdx];

  const handlePrevSection = () => {
    if (currentSectionIdx > 0) {
      handleTabChange(SECTION_CONFIG[currentSectionIdx - 1].key);
    } else {
      handleTabChange('all');
    }
  };

  const handleNextSection = () => {
    if (currentSectionIdx < SECTION_CONFIG.length - 1) {
      handleTabChange(SECTION_CONFIG[currentSectionIdx + 1].key);
    }
  };

  return (
    <div className="flex-1 bg-slate-50 dark:bg-[#090d16] p-4 sm:p-6 lg:p-10 overflow-y-auto custom-scrollbar transition-colors duration-200">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Executive Governance Action Banner */}
        <div className="bg-white border border-slate-200 dark:bg-[#0f172a] dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:border-slate-700 text-slate-700 dark:text-slate-300">
              <ShieldCheck className="w-5 h-5 text-slate-800 dark:text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Governance Pipeline
                </span>
                {isAccepted && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 dark:bg-emerald-950/70 dark:border-emerald-700 dark:text-emerald-300 text-[11px] font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span>Accepted</span>
                  </span>
                )}
                {isRevisionRequested && (
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-300 text-rose-800 dark:bg-rose-950/70 dark:border-rose-700 dark:text-rose-300 text-[11px] font-semibold flex items-center gap-1">
                    <RotateCcw className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                    <span>Revision Requested</span>
                  </span>
                )}
                {isApproved && (
                  <span className="px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-300 text-teal-800 dark:bg-teal-950/70 dark:border-teal-700 dark:text-teal-300 text-[11px] font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                    <span>Manager Signed Off</span>
                  </span>
                )}
                {isDelivered && (
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-300 text-blue-800 dark:bg-blue-950/70 dark:border-blue-700 dark:text-blue-300 text-[11px] font-semibold flex items-center gap-1">
                    <Lock className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                    <span>Delivered & Locked</span>
                  </span>
                )}
                {isPending && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-300 text-amber-800 dark:bg-amber-950/70 dark:border-amber-700 dark:text-amber-300 text-[11px] font-semibold flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    <span>Awaiting Review</span>
                  </span>
                )}
                {!isAccepted && !isRevisionRequested && !isApproved && !isDelivered && !isPending && (
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-300 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 text-[11px] font-medium flex items-center gap-1">
                    <FileEdit className="w-3 h-3 text-slate-500" />
                    <span>Drafting</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isAccepted ? (
                  <span>Proposal accepted and digitally executed by <strong className="text-slate-800 dark:text-slate-200">{proposal.acceptance?.accepted_by_name || 'Client'}</strong>. Commercial terms and deliverables locked.</span>
                ) : isRevisionRequested ? (
                  <span>Client requested adjustments to delivered proposal. Sales manager authorization required to unlock edits.</span>
                ) : isApproved ? (
                  <span>Approved by <strong className="text-slate-800 dark:text-slate-200">{proposal.approval?.approved_by || 'Management'}</strong>. Unlocked for client delivery.</span>
                ) : isPending ? (
                  <span>Proposal submitted. Awaiting manager review and sign-off.</span>
                ) : isSales ? (
                  <span>Peer Review Protocol: Submit for management authorization. Final approval requires manager sign-off.</span>
                ) : (
                  <span>Manager Review: Inspect sections and sign off to approve client delivery.</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Sales Rep Submit Button: ONLY shown for draft or changes_requested */}
            {isSales && (proposal.status === 'draft' || proposal.status === 'changes_requested') && (
              <button
                type="button"
                onClick={onSubmitForApproval}
                disabled={isProcessing}
                className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-semibold text-xs shadow-xs flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit for Review</span>
              </button>
            )}

            {/* Manager Approval Controls: ONLY shown for pending_approval or draft */}
            {isManager && (proposal.status === 'pending_approval' || proposal.status === 'draft') && (
              <>
                {isCreator ? (
                  <div className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-300 text-slate-800 dark:bg-slate-900/60 dark:border-slate-700 dark:text-slate-300 text-xs flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                    <span>Dual Sign-Off Required: You authored this proposal. An independent manager must provide sign-off.</span>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      placeholder="Manager feedback notes..."
                      value={feedbackNotes}
                      onChange={(e) => setFeedbackNotes(e.target.value)}
                      className="bg-white border border-slate-300 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 rounded-lg px-3 py-1.5 text-slate-800 text-xs w-52 focus:outline-none focus:border-slate-900 dark:focus:border-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => onRequestChanges(feedbackNotes)}
                      disabled={isProcessing}
                      className="px-3 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-750 font-semibold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                      <span>Request Changes</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onApprove(feedbackNotes)}
                      disabled={isProcessing}
                      className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white dark:bg-emerald-600 dark:hover:bg-emerald-500 font-semibold text-xs shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve & Sign Off</span>
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Approved / Delivered Controls & EML */}
            {(isApproved || isDelivered) && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadEml}
                  className="px-3 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-750 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                  title="Download RFC 822 email format"
                >
                  <Download className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                  <span>Export .eml</span>
                </button>

                {!isDelivered ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="email"
                      value={targetEmail}
                      onChange={(e) => setTargetEmail(e.target.value)}
                      placeholder="client@company.com"
                      className="bg-white border border-slate-300 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 text-xs w-48 font-mono focus:outline-none focus:border-slate-900 dark:focus:border-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => onDeliver(targetEmail)}
                      disabled={isProcessing}
                      className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-semibold text-xs shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Deliver to Client</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 dark:bg-slate-850 dark:border-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Delivered to {proposal.delivery?.client_email || proposal.client_email}</span>
                    </div>
                    <a
                      href={`/client-view.html?id=${proposal.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                      title="View the official print/PDF proposal sheet sent to the client"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                      <span>Client Sheet</span>
                    </a>
                    {!isRevisionRequested && !isAccepted && (
                      <button
                        type="button"
                        onClick={() => setIsRevisionModalOpen(true)}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                        title="Log client revision request to unlock proposal via manager authorization"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Request Revision</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Version Diff Comparison Trigger */}
            {proposal.version > 1 && (
              <button
                type="button"
                onClick={() => setIsDiffModalOpen(true)}
                className="px-3 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                title="Compare line-by-line changes against previous versions"
              >
                <FileCode2 className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                <span>Compare Versions</span>
              </button>
            )}

            {/* View Digital Seal Button if Accepted */}
            {isAccepted && (
              <a
                href={`/client-view.html?id=${proposal.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                title="View the official accepted client agreement"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>View Digital Seal</span>
              </a>
            )}
          </div>
        </div>

        {/* Manager Revision Unlock Banner */}
        {isRevisionRequested && (
          <div className="bg-slate-900 text-white dark:bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-emerald-400 animate-spin" />
                  <h3 className="text-sm font-bold tracking-tight">Client Revision Requested</h3>
                  <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-mono font-semibold uppercase">
                    Locked
                  </span>
                </div>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  The client requested changes to this delivered proposal. Per Four-Eyes governance, sales reps cannot edit delivered proposals without explicit manager authorization.
                </p>
                {proposal.revision_request_notes && (
                  <div className="mt-2 p-3 rounded-lg bg-black/40 border border-white/10 text-xs text-slate-200">
                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block mb-0.5">Feedback / Modification Scope:</span>
                    {proposal.revision_request_notes}
                  </div>
                )}
              </div>

              <div className="flex-shrink-0">
                {isManager ? (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      placeholder="Manager unlock note..."
                      value={managerUnlockNotes}
                      onChange={(e) => setManagerUnlockNotes(e.target.value)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-600 text-white text-xs placeholder:text-slate-400 focus:outline-none focus:border-white w-48"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (onApproveRevisionUnlock) {
                          await onApproveRevisionUnlock(managerUnlockNotes);
                        }
                      }}
                      disabled={isProcessing}
                      className="px-4 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                    >
                      <Unlock className="w-3.5 h-3.5 text-slate-900" />
                      <span>Authorize Unlock</span>
                    </button>
                  </div>
                ) : (
                  <div className="px-3 py-2 rounded-lg bg-white/10 text-slate-300 text-xs font-medium flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-slate-400" />
                    <span>Awaiting sales manager unlock authorization</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Paper Document Container */}
        <article className="bg-white border border-slate-200 dark:bg-[#0f172a] dark:border-slate-800 rounded-2xl p-6 sm:p-8 lg:p-12 shadow-sm dark:shadow-2xl space-y-8 document-sheet relative transition-colors">
          
          {/* Header & Meta */}
          <header className="border-b border-slate-200 dark:border-slate-800 pb-5">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="space-y-2 max-w-3xl">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-slate-700 dark:text-slate-300">
                    Proposal Document
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span className="text-[11px] font-mono font-medium text-slate-700 dark:text-slate-300">
                    Version {proposal.version}
                  </span>
                </div>

                <h1 className="text-xl sm:text-2xl font-bold font-display text-slate-950 dark:text-white tracking-tight leading-snug">
                  {proposal.title}
                </h1>

                {/* Clean, High-Contrast Metadata Row */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1 text-xs text-slate-800 dark:text-slate-200">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">Prepared for:</span>
                    <strong className="text-slate-950 dark:text-white font-bold">{proposal.company_name}</strong>
                    <span className="text-slate-700 dark:text-slate-300">({proposal.client_name})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">Prepared by:</span>
                    <strong className="text-slate-950 dark:text-white font-bold">{proposal.salesperson_name}</strong>
                    <span className="text-slate-700 dark:text-slate-300">(Koya Talent)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">Discovery Date:</span>
                    <span className="font-mono text-slate-950 dark:text-white font-bold">{proposal.date_of_call}</span>
                  </div>
                </div>
              </div>

              {/* Status Pill & Interactive Validity Button */}
              <div className="flex flex-row md:flex-col items-start md:items-end gap-2.5 flex-shrink-0 pt-0.5">
                {/* Status Pill */}
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize border ${
                  proposal.status === 'accepted'
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-400 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-700'
                    : proposal.status === 'approved'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                    : proposal.status === 'delivered'
                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-white'
                    : proposal.status === 'revision_requested'
                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-white'
                    : proposal.status === 'pending_approval'
                    ? 'bg-slate-100 text-slate-900 border-slate-400 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600'
                    : 'bg-slate-100 text-slate-900 border-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700'
                }`}>
                  {proposal.status === 'accepted' ? 'Accepted' : proposal.status.replace('_', ' ')}
                </span>

                {/* Interactive Validity Button (Simplified, No Percentages) */}
                <button
                  type="button"
                  onClick={() => setIsValidityModalOpen(true)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer shadow-2xs ${
                    validityTier === 'red'
                      ? 'bg-red-50 border-red-500 text-red-700 hover:bg-red-100 dark:bg-red-950/60 dark:border-red-600 dark:text-red-300'
                      : validityTier === 'orange'
                      ? 'bg-amber-50 border-amber-500 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/60 dark:border-amber-600 dark:text-amber-300'
                      : 'bg-emerald-50 border-emerald-500 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:border-emerald-600 dark:text-emerald-300'
                  }`}
                  title="Click to inspect quote validity timeline and commercial guarantee"
                >
                  <span className={`w-2 h-2 rounded-full ${
                    validityTier === 'red' 
                      ? 'bg-red-600 animate-pulse' 
                      : validityTier === 'orange' 
                      ? 'bg-amber-500' 
                      : 'bg-emerald-500'
                  }`} />
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Validity Range</span>
                </button>

                {proposal.content_digest && (
                  <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400 flex items-center gap-1" title="SHA-256 Content Digest">
                    <Hash className="w-3 h-3" />
                    {proposal.content_digest.slice(0, 8)}...
                  </span>
                )}
              </div>
            </div>
          </header>

          {/* TBC Simple Tag Bar */}
          {proposal.has_gaps && proposal.gaps && proposal.gaps.length > 0 && (
            <div className="px-3.5 py-2 rounded-lg bg-amber-50/70 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/40 text-xs flex flex-wrap items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-1.5 py-0.5 rounded bg-red-600 text-white font-mono font-bold text-[10px] tracking-wide uppercase">
                  TBC
                </span>
                <span className="text-slate-700 dark:text-slate-300 font-semibold text-xs">
                  Pending Confirmation:
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {proposal.gaps.map((gap, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-white border border-amber-300 dark:bg-slate-900 dark:border-amber-700/60 text-[11px] font-semibold text-amber-900 dark:text-amber-200 shadow-2xs"
                    >
                      {gap.field.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                {proposal.gaps.length} {proposal.gaps.length === 1 ? 'item' : 'items'}
              </span>
            </div>
          )}

          {/* SECTION NAVIGATION */}
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center justify-between gap-2.5 mb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Sections:
                </span>
                {activeTab !== 'all' && (
                  <button
                    onClick={() => handleTabChange('all')}
                    className="text-xs font-semibold text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white flex items-center gap-1 transition-colors"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Show All</span>
                  </button>
                )}
              </div>
            </div>

            <nav className="flex items-center gap-1.5 overflow-x-auto pb-1.5 custom-scrollbar">
              {/* All Sections Tab */}
              <button
                type="button"
                onClick={() => handleTabChange('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                  activeTab === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs font-bold'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>All Sections</span>
              </button>

              {/* Supporting Material Tab */}
              {proposal.supporting_material && (
                <button
                  type="button"
                  onClick={() => handleTabChange('supporting_material')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                    activeTab === 'supporting_material'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs font-bold'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  <FileCode2 className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
                  <span>Discovery Notes</span>
                </button>
              )}

              {/* Individual Section Tabs */}
              {SECTION_CONFIG.map(({ key, number, shortTitle }) => {
                const content = proposal.sections?.[key] || '';
                const hasTBC = content.includes('[TO BE CONFIRMED]');
                const isActive = activeTab === key;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleTabChange(key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs font-bold'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isActive
                        ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                        : 'bg-slate-300 text-slate-950 dark:bg-slate-700 dark:text-white'
                    }`}>
                      {number}
                    </span>
                    <span>{shortTitle}</span>
                    {hasTBC && (
                      <span className="w-2 h-2 rounded-full bg-red-600 inline-block animate-pulse" title="Requires Confirmation (Contains [TO BE CONFIRMED])" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* VIEW MODE 0: SUPPORTING MATERIAL & TRANSCRIPT */}
          {activeTab === 'supporting_material' && (
            <div className="bg-slate-50/80 border border-slate-200 dark:bg-slate-900/40 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <FileCode2 className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Discovery Call Notes & Supporting Documentation
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopySection('supporting_material', proposal.supporting_material || '')}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1"
                >
                  {copiedSection === 'supporting_material' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSection === 'supporting_material' ? 'Copied' : 'Copy Notes'}</span>
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                The prompt engine ingested this source transcript to extract architecture requirements, bottlenecks, and timeline milestones into the 7 proposal sections.
              </p>
              <div className="p-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
                {proposal.supporting_material || 'No supporting background documentation was provided during intake.'}
              </div>
            </div>
          )}

          {/* VIEW MODE 1: SINGLE SECTION FOCUSED FULL VIEW */}
          {activeTab !== 'all' && currentSectionConfig && (
            <div className="space-y-6">
              {(() => {
                const key = currentSectionConfig.key;
                const content = proposal.sections?.[key] || '';
                const isEditing = editingSection === key;
                const hasTBC = content.includes('[TO BE CONFIRMED]');

                return (
                  <div className="bg-slate-50/70 border border-slate-200 dark:bg-slate-900/40 dark:border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 transition-colors">
                    {/* Focused View Top Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center text-xs font-bold shadow-2xs">
                            {currentSectionConfig.number}
                          </span>
                          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                            {currentSectionConfig.title}
                          </h2>
                          {hasTBC && (
                            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-800 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200 text-[10px] font-mono font-semibold">
                              Requires Confirmation
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {currentSectionConfig.desc}
                        </p>
                      </div>

                      {/* Focused Actions */}
                      {!isEditing && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isDelivered && (
                            <div className="px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-300 text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5">
                              <Lock className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                              <span>Locked (Delivered)</span>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => handleCopySection(key, content)}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs"
                            title="Copy section content to clipboard"
                          >
                            {copiedSection === key ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                          {!isDelivered && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleStartEdit(key, content)}
                                disabled={isProcessing}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                <span>Edit Section</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenRegen(key)}
                                disabled={isProcessing}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                <span>AI Revise</span>
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Content or Full Textarea Editor */}
                    <div>
                      {isEditing ? (
                        <div className="space-y-4">
                          <textarea
                            rows={12}
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full p-4 bg-white border border-slate-300 rounded-xl text-slate-900 dark:bg-slate-950 dark:border-slate-700 dark:text-slate-100 text-sm font-sans focus:outline-none focus:border-slate-900 dark:focus:border-slate-400 resize-y leading-relaxed shadow-inner"
                          />
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-xs text-slate-400">
                              Editing will record an audit trail entry and bump version to v{proposal.version + 1}.
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 text-xs font-semibold transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(key)}
                                disabled={isProcessing}
                                className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Save Changes (v{proposal.version + 1})</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <ProposalContentRenderer content={content} sectionKey={key} />
                      )}
                    </div>

                    {/* Bottom Section Navigator */}
                    <div className="flex items-center justify-between pt-6 border-t border-slate-200 dark:border-slate-800 text-xs">
                      <button
                        onClick={handlePrevSection}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>{currentSectionIdx === 0 ? 'All Sections' : `Prev: ${SECTION_CONFIG[currentSectionIdx - 1].shortTitle}`}</span>
                      </button>

                      <div className="text-slate-700 dark:text-slate-300 font-bold">
                        Section {currentSectionIdx + 1} of {SECTION_CONFIG.length}
                      </div>

                      {currentSectionIdx < SECTION_CONFIG.length - 1 ? (
                        <button
                          onClick={handleNextSection}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
                        >
                          <span>Next: {SECTION_CONFIG[currentSectionIdx + 1].shortTitle}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleTabChange('all')}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
                        >
                          <span>View Full Document</span>
                          <Layers className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* VIEW MODE 2: ALL 7 PRD SECTIONS VIEW */}
          {activeTab === 'all' && (
            <div className="space-y-8">
              {SECTION_CONFIG.map(({ key, number, title, desc }) => {
                const content = proposal.sections?.[key] || '';
                const isEditing = editingSection === key;
                const hasTBC = content.includes('[TO BE CONFIRMED]');

                return (
                  <section
                    key={key}
                    id={`sec-${key}`}
                    className={`p-6 rounded-xl border transition-all ${
                      isEditing
                        ? 'bg-slate-50 border-slate-400 dark:bg-slate-900 dark:border-slate-500 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-300 dark:bg-slate-900/40 dark:border-slate-800 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center text-[10px] font-bold">
                            {number}
                          </span>
                          <h2 className="text-base font-bold text-slate-950 dark:text-white tracking-tight">
                            {title}
                          </h2>
                          {hasTBC && (
                            <span className="px-2 py-0.5 rounded bg-red-50 border border-red-500 text-red-700 dark:bg-red-950/60 dark:border-red-600 dark:text-red-300 text-[10px] font-mono font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse inline-block" />
                              Requires Confirmation
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 font-normal mt-1">{desc}</p>
                      </div>

                      {/* Section Action Controls */}
                      {!isEditing && (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleTabChange(key)}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs"
                            title="Focus in full tab view"
                          >
                            <Maximize2 className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                            <span>Focus</span>
                          </button>
                          {!isDelivered ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleStartEdit(key, content)}
                                disabled={isProcessing}
                                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs"
                                title="Edit this section manually"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenRegen(key)}
                                disabled={isProcessing}
                                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs"
                                title="Ask Claude to regenerate this single section"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                                <span>AI Revise</span>
                              </button>
                            </>
                          ) : (
                            <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1">
                              <Lock className="w-3 h-3" /> Locked
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Content Area or Editor */}
                    <div className="pt-4">
                      {isEditing ? (
                        <div className="space-y-4">
                          <textarea
                            rows={8}
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full p-4 bg-white border border-slate-300 rounded-lg text-slate-900 dark:bg-slate-950 dark:border-slate-700 dark:text-slate-100 text-sm font-sans focus:outline-none focus:border-slate-900 dark:focus:border-slate-400 resize-y leading-relaxed"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 text-xs font-semibold transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(key)}
                              disabled={isProcessing}
                              className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Save Changes (v{proposal.version + 1})</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <ProposalContentRenderer content={content} sectionKey={key} />
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </article>

        {/* AI Section Revision Modal */}
        {regenSection && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm dark:bg-black/75 flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 dark:bg-[#0f172a] dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-slate-800 dark:text-slate-200" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Regenerate Section: <span className="capitalize">{regenSection.replace('_', ' ')}</span>
                  </h3>
                </div>
                <button
                  onClick={() => setRegenSection(null)}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Claude Haiku will rewrite only this section based on your guidance. All other 6 sections remain strictly unmodified and byte-identical.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Specific Revision Guidance:
                </label>
                <textarea
                  rows={4}
                  placeholder="e.g. Expand deliverables to include weekly executive summaries, or increase milestone clarity..."
                  value={regenInstruction}
                  onChange={(e) => setRegenInstruction(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-300 dark:bg-slate-900 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-slate-900 dark:focus:border-slate-400 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRegenSection(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRegen}
                  disabled={isProcessing}
                  className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
                  <span>Regenerate with AI</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Client Revision Request Modal */}
        {isRevisionModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm dark:bg-black/75 flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 dark:bg-[#0f172a] dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-slate-800 dark:text-slate-200" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Request Client Revision
                  </h3>
                </div>
                <button
                  onClick={() => setIsRevisionModalOpen(false)}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Log the revision points requested by the client. This transitions the proposal status to <strong>Revision Requested</strong> and notifies sales management via Slack to review and authorize unlocking the proposal for edits.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Client Feedback & Modification Scope:
                </label>
                <textarea
                  rows={4}
                  placeholder="e.g. Client requested 15% reduction in phase 2 timeline and adjusted SLA terms for onboarding..."
                  value={clientFeedbackInput}
                  onChange={(e) => setClientFeedbackInput(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-300 dark:bg-slate-900 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-slate-900 dark:focus:border-slate-400 resize-none rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRevisionModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (onRequestClientRevision && clientFeedbackInput.trim()) {
                      await onRequestClientRevision(clientFeedbackInput.trim());
                      setIsRevisionModalOpen(false);
                      setClientFeedbackInput('');
                    }
                  }}
                  disabled={isProcessing || !clientFeedbackInput.trim()}
                  className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit for Manager Unlock</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Version Diff & Redline Comparison Modal */}
        {isDiffModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm dark:bg-black/75 flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 dark:bg-[#0f172a] dark:border-slate-800 rounded-2xl max-w-4xl w-full p-6 shadow-2xl flex flex-col max-h-[85vh] transition-colors">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                    <FileCode2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Version Diff & Redline Comparison
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Comparing historic snapshot <strong className="font-mono">v{selectedDiffVersion}</strong> against current <strong className="font-mono">v{proposal.version}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Version Picker */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-400 text-[11px]">Compare with:</span>
                    <select
                      value={selectedDiffVersion ?? ''}
                      onChange={(e) => setSelectedDiffVersion(Number(e.target.value))}
                      className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs rounded-lg px-2 py-1 font-mono font-bold outline-none"
                    >
                      {proposal.version_history?.map((h) => (
                        <option key={h.version} value={h.version} disabled={h.version === proposal.version}>
                          v{h.version}{h.version === proposal.version ? ' (Current)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => setIsDiffModalOpen(false)}
                    className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Section Tabs inside Diff Modal */}
              <div className="flex items-center gap-1 overflow-x-auto py-2.5 border-b border-slate-100 dark:border-slate-800 flex-shrink-0 custom-scrollbar text-xs">
                {SECTION_CONFIG.map((sec) => (
                  <button
                    key={sec.key}
                    type="button"
                    onClick={() => setDiffSectionKey(sec.key)}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-medium whitespace-nowrap ${
                      diffSectionKey === sec.key
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-50 dark:bg-slate-800/60'
                    }`}
                  >
                    {sec.shortTitle}
                  </button>
                ))}
              </div>

              {/* Redline Body */}
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {(() => {
                  const targetHistory = proposal.version_history?.find((h) => h.version === selectedDiffVersion);
                  const prevText = targetHistory?.sections_snapshot?.[diffSectionKey] || (targetHistory?.modified_section === diffSectionKey ? targetHistory?.previous_content : '') || '';
                  const currText = proposal.sections[diffSectionKey] || '';

                  if (prevText.trim() === currText.trim()) {
                    return (
                      <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
                        <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
                        <div className="font-semibold text-slate-700 dark:text-slate-300">
                          Identical Content
                        </div>
                        <p>No textual modifications detected in "{diffSectionKey.replace('_', ' ')}" between version {selectedDiffVersion} and version {proposal.version}.</p>
                      </div>
                    );
                  }

                  const prevLines: string[] = prevText.split('\n');
                  const currLines: string[] = currText.split('\n');

                  return (
                    <div className="space-y-1.5 font-mono text-xs leading-relaxed">
                      <div className="flex items-center justify-between text-[11px] font-sans text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800 mb-2">
                        <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium">
                          <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
                          Strikethrough / Red = Removed from v{selectedDiffVersion}
                        </span>
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                          Green = Added in current v{proposal.version}
                        </span>
                      </div>

                      {prevLines.map((line: string, i: number) => {
                        const trimmed = line.trim();
                        if (trimmed && !currLines.some((c: string) => c.trim() === trimmed)) {
                          return (
                            <div key={`del-${i}`} className="bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-300 px-2.5 py-1 rounded flex items-start gap-2 line-through">
                              <span className="text-rose-500 font-bold select-none">-</span>
                              <span>{line}</span>
                            </div>
                          );
                        }
                        return null;
                      })}

                      {currLines.map((line: string, i: number) => {
                        const trimmed = line.trim();
                        const isAdded = trimmed && !prevLines.some((p: string) => p.trim() === trimmed);
                        if (isAdded) {
                          return (
                            <div key={`add-${i}`} className="bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900/60 dark:text-emerald-300 px-2.5 py-1 rounded flex items-start gap-2">
                              <span className="text-emerald-500 font-bold select-none">+</span>
                              <span>{line}</span>
                            </div>
                          );
                        }
                        return (
                          <div key={`same-${i}`} className="text-slate-600 dark:text-slate-400 px-2.5 py-0.5 flex items-start gap-2 opacity-80">
                            <span className="text-slate-300 dark:text-slate-600 select-none">&nbsp;</span>
                            <span>{line || '\u00A0'}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 flex-shrink-0">
                <span>Deterministic redline comparison against audit snapshot</span>
                <button
                  type="button"
                  onClick={() => setIsDiffModalOpen(false)}
                  className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-semibold transition-colors cursor-pointer"
                >
                  Close Diff Viewer
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Validity Range & Commercial Guarantee Modal */}
        {isValidityModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
              <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    validityTier === 'red' ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400' :
                    validityTier === 'orange' ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400' :
                    'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                  }`}>
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-950 dark:text-white">
                      Quote Validity & Commercial Terms
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      30-Day Guaranteed Procurement Window
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsValidityModalOpen(false)}
                  className="text-slate-500 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Status Banner (No Progress Bar, No Percentages) */}
              <div className={`p-4 rounded-xl border space-y-1.5 ${
                validityTier === 'red'
                  ? 'bg-red-50 border-red-500 text-red-950 dark:bg-red-950/60 dark:border-red-600 dark:text-red-200'
                  : validityTier === 'orange'
                  ? 'bg-amber-50 border-amber-500 text-amber-950 dark:bg-amber-950/60 dark:border-amber-600 dark:text-amber-200'
                  : 'bg-emerald-50 border-emerald-500 text-emerald-950 dark:bg-emerald-950/60 dark:border-emerald-600 dark:text-emerald-200'
              }`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    validityTier === 'red' ? 'bg-red-600 animate-pulse' :
                    validityTier === 'orange' ? 'bg-amber-500' :
                    'bg-emerald-500'
                  }`} />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {validityTier === 'red'
                      ? (isQuoteExpired ? 'Quote Expired' : 'Urgent: Imminent Expiration')
                      : validityTier === 'orange'
                      ? 'Active Decision Window'
                      : 'Active Commercial Guarantee'}
                  </span>
                </div>

                <p className="text-xs opacity-90 leading-relaxed">
                  {validityTier === 'red'
                    ? (isQuoteExpired
                        ? 'This proposal has expired. A refreshed discovery update is required before signing.'
                        : 'Less than 5 days remaining before terms expire. Prompt client decision or manager extension recommended.')
                    : validityTier === 'orange'
                    ? 'Proposal is within the active client procurement window. Commercial scope and milestones remain locked.'
                    : 'Standard 30-day guarantee is active. Full commercial pricing and team allocations are secured.'}
                </p>
              </div>

              {/* Date Range Cards */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    Discovery Date
                  </span>
                  <span className="font-mono font-bold text-slate-950 dark:text-white text-sm">
                    {proposal.date_of_call || '2026-07-10'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    Valid Until
                  </span>
                  <span className="font-mono font-bold text-slate-950 dark:text-white text-sm">
                    {formattedExpiryDate}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 space-y-1 leading-relaxed">
                <div className="font-bold text-slate-950 dark:text-white">Commercial Guarantee:</div>
                <p>
                  Koya Talent guarantees milestone pricing, rate cards, and technical staffing allocations for 30 calendar days from the discovery call date.
                </p>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsValidityModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  Close Window
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
