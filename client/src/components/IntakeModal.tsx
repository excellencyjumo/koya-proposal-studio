import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  FileText, 
  ChevronDown, 
  Layers, 
  DollarSign, 
  Building2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface IntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (intakeData: Record<string, any>, supportingMaterial: string) => Promise<void>;
  isGenerating: boolean;
  activeGaps?: any[];
}

export const IntakeModal: React.FC<IntakeModalProps> = ({
  isOpen,
  onClose,
  onGenerate,
  isGenerating,
  activeGaps = []
}) => {
  const { user } = useAuth();

  const [companyName, setCompanyName] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [salespersonName, setSalespersonName] = useState(user?.name || '');
  const [dateOfCall, setDateOfCall] = useState(new Date().toISOString().split('T')[0]);
  const [estimatedPricing, setEstimatedPricing] = useState('');
  const [proposedTimeline, setProposedTimeline] = useState('');
  const [clientNeedsSummary, setClientNeedsSummary] = useState('');
  const [projectScope, setProjectScope] = useState('');
  const [targetRoles, setTargetRoles] = useState('');
  const [constraints, setConstraints] = useState('');
  const [supportingMaterial, setSupportingMaterial] = useState('');

  const [showPresets, setShowPresets] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  const loadPreset = (type: 'acme' | 'apex' | 'transcript') => {
    if (type === 'acme') {
      setCompanyName('Acme Logistics');
      setClientName('Rachel Adams');
      setClientEmail('rachel@acmelogistics.com');
      setSalespersonName('Sarah Chen');
      setDateOfCall('2026-06-30');
      setEstimatedPricing('$48,000 fixed milestone fee');
      setProposedTimeline('8 weeks across 3 delivery phases');
      setClientNeedsSummary('Manual carrier onboarding and delayed invoice reconciliation causing 25 hours/week of overhead.');
      setProjectScope('Automated carrier onboarding workflow, invoice OCR reconciliation, and an executive KPI dashboard.');
      setTargetRoles('Recruitment Ops Consulting, Workflow Automation, Supabase Architecture');
      setConstraints('Must integrate with existing ERP via REST APIs. SOC 2 Type II compliance required.');
      setSupportingMaterial('');
    } else if (type === 'apex') {
      setCompanyName('Apex Enterprises');
      setClientName('David Miller');
      setClientEmail('david@apexenterprises.com');
      setSalespersonName('Sarah Chen');
      setDateOfCall('2026-07-02');
      setEstimatedPricing(''); // Intentional missing field
      setProposedTimeline(''); // Intentional missing field
      setClientNeedsSummary('Urgent need for executive engineering leadership and scalable workflow automation.');
      setProjectScope(''); // Intentional missing field
      setTargetRoles('Fractional VP Engineering, Staff DevOps Engineer');
      setConstraints('AWS infrastructure, strict hiring deadline of 30 days');
      setSupportingMaterial('');
    } else if (type === 'transcript') {
      setCompanyName('BioHealth Systems');
      setClientName('Dr. Elena Rostova');
      setClientEmail('e.rostova@biohealth.org');
      setSalespersonName('Sarah Chen');
      setDateOfCall('2026-07-05');
      setEstimatedPricing('$75,000 fixed fee');
      setProposedTimeline('12 weeks');
      setClientNeedsSummary('HIPAA-compliant clinical research portal and data pipeline migration.');
      setProjectScope('Modernize patient intake data pipeline and connect to HL7 FHIR store.');
      setTargetRoles('Principal Cloud Architect, Healthcare Data Engineer');
      setConstraints('HIPAA, BAA agreement required');
      setSupportingMaterial(
        'DISCOVERY CALL TRANSCRIPT — BIOHEALTH SYSTEMS & KOYA TALENT\n' +
        'Participants: Dr. Elena Rostova (Chief Medical Officer), Sarah Chen (Koya Talent)\n' +
        'Date: July 5, 2026\n\n' +
        'Sarah Chen: "Dr. Rostova, thank you for meeting. What is the biggest operational bottleneck in your current clinical trials pipeline?"\n' +
        'Dr. Rostova: "Right now, patient intake forms from 14 regional clinic sites are submitted as scattered PDF files. It takes our clinical coordinators 3 days to manually scrub patient data and verify eligibility. We need an automated HL7 FHIR ingest pipeline with role-based access control."\n' +
        'Sarah Chen: "What are your core security and compliance mandates?"\n' +
        'Dr. Rostova: "Strict HIPAA compliance, end-to-end encryption at rest and in transit, and complete audit trails for every query."'
      );
    }
    setShowPresets(false);
    setValidationError(null);
  };

  const handleReset = () => {
    setCompanyName('');
    setClientName('');
    setClientEmail('');
    setSalespersonName(user?.name || '');
    setEstimatedPricing('');
    setProposedTimeline('');
    setClientNeedsSummary('');
    setProjectScope('');
    setTargetRoles('');
    setConstraints('');
    setSupportingMaterial('');
    setValidationError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!companyName.trim()) {
      setValidationError('Company Name is required.');
      return;
    }
    if (!clientName.trim()) {
      setValidationError('Contact Person is required.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!clientEmail.trim() || !emailRegex.test(clientEmail.trim())) {
      setValidationError('A valid Client Email address is required to enable automated governance delivery.');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    if (dateOfCall && dateOfCall > today) {
      setValidationError(`Discovery Call Date (${dateOfCall}) cannot be in the future. Please select today (${today}) or an earlier date.`);
      return;
    }
    setValidationError(null);

    const intakeData = {
      company_name: companyName.trim() || 'Client Organization',
      client_name: clientName.trim() || 'Primary Contact',
      client_email: clientEmail.trim(),
      salesperson_name: salespersonName.trim() || (user?.name || 'Account Executive'),
      date_of_call: dateOfCall,
      estimated_pricing: estimatedPricing.trim(),
      proposed_timeline: proposedTimeline.trim(),
      client_needs_summary: clientNeedsSummary.trim(),
      project_scope: projectScope.trim(),
      target_roles: targetRoles.trim(),
      constraints: constraints.trim()
    };

    await onGenerate(intakeData, supportingMaterial);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm dark:bg-black/75 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white border border-slate-200 dark:bg-[#0f172a] dark:border-slate-800 rounded-2xl max-w-3xl w-full shadow-2xl flex flex-col max-h-[90vh] my-auto overflow-hidden animate-fade-in transition-colors">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center font-bold shadow-sm">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                New Proposal Intake
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enter discovery details to generate an executive 7-section proposal.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowPresets(!showPresets)}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <span>Sample Templates</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showPresets && (
                <div className="absolute right-0 mt-1.5 w-64 bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-xl shadow-xl py-1 z-50 text-xs animate-fade-in">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                    Verification Presets
                  </div>
                  <button
                    type="button"
                    onClick={() => loadPreset('acme')}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex flex-col"
                  >
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Acme Logistics</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Full discovery with $48,000 fee</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => loadPreset('apex')}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex flex-col border-t border-slate-50 dark:border-slate-800"
                  >
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Apex Enterprises</span>
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Missing fields (triggers gap review)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => loadPreset('transcript')}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex flex-col border-t border-slate-50 dark:border-slate-800"
                  >
                    <span className="font-semibold text-slate-800 dark:text-slate-200">BioHealth Systems</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Call transcript extraction</span>
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Validation Error Banner */}
        {validationError && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2 animate-fade-in shadow-xs">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span className="font-medium">{validationError}</span>
          </div>
        )}

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          
          {/* Section 1: Client Overview */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span>Client Information</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Company Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Company name"
                  value={companyName}
                  onChange={(e) => { setCompanyName(e.target.value); setValidationError(null); }}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 dark:bg-slate-900 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-slate-900 dark:focus:border-slate-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Contact Person <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contact name"
                  value={clientName}
                  onChange={(e) => { setClientName(e.target.value); setValidationError(null); }}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 dark:bg-slate-900 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-slate-900 dark:focus:border-slate-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Client Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="client@company.com"
                  value={clientEmail}
                  onChange={(e) => { setClientEmail(e.target.value); setValidationError(null); }}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 dark:bg-slate-900 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-slate-900 dark:focus:border-slate-400 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Commercial Parameters */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span>Commercial Terms & Timing</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Estimated Pricing <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">(Optional — Gap Review)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 50000"
                  value={estimatedPricing}
                  onChange={(e) => setEstimatedPricing(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 dark:bg-slate-900 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-slate-900 dark:focus:border-slate-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Proposed Timeline <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">(Optional — Gap Review)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 8 weeks"
                  value={proposedTimeline}
                  onChange={(e) => setProposedTimeline(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 dark:bg-slate-900 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-slate-900 dark:focus:border-slate-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Discovery Date
                </label>
                <input
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                  value={dateOfCall}
                  onChange={(e) => {
                    setDateOfCall(e.target.value);
                    const today = new Date().toISOString().split('T')[0];
                    if (e.target.value && e.target.value > today) {
                      setValidationError(`Discovery Date cannot be in the future. Selected date must be today (${today}) or earlier.`);
                    } else {
                      setValidationError(null);
                    }
                  }}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 dark:bg-slate-900 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-900 dark:focus:border-slate-400 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Technical Scope & Requirements */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span>Project Scope & Solutions</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Client Problem & Pain Points <span className="text-rose-500">*</span> <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">(min. 10 chars for coherent synthesis)</span>
              </label>
              <textarea
                rows={2}
                required
                minLength={10}
                placeholder="Describe current operational bottlenecks and inefficiencies..."
                value={clientNeedsSummary}
                onChange={(e) => { setClientNeedsSummary(e.target.value); setValidationError(null); }}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 dark:bg-slate-900 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-slate-900 dark:focus:border-slate-400 transition-colors resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Scope of Work & Objectives
              </label>
              <textarea
                rows={2}
                placeholder="Outline key technical targets, deliverables, and automated workflows..."
                value={projectScope}
                onChange={(e) => setProjectScope(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 dark:bg-slate-900 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-slate-900 dark:focus:border-slate-400 transition-colors resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Talent Roles
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lead Architect, Data Engineer"
                  value={targetRoles}
                  onChange={(e) => setTargetRoles(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 dark:bg-slate-900 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-slate-900 dark:focus:border-slate-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Constraints & Compliance
                </label>
                <input
                  type="text"
                  placeholder="e.g. SOC 2 Type II, REST API integration"
                  value={constraints}
                  onChange={(e) => setConstraints(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 dark:bg-slate-900 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-slate-900 dark:focus:border-slate-400 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Supporting Material / Call Transcript (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="Paste interview transcripts, client notes, or discovery documents..."
                value={supportingMaterial}
                onChange={(e) => setSupportingMaterial(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 dark:bg-slate-900 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-slate-900 dark:focus:border-slate-400 transition-colors resize-none"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              Clear Form
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isGenerating}
                className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 rounded-lg shadow flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
                <span>{isGenerating ? 'Generating Proposal...' : 'Generate Proposal'}</span>
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};
