import React from 'react';
import { Proposal } from '../types';
import { Printer, ArrowLeft, Building2, CheckCircle, Calendar, DollarSign, Clock } from 'lucide-react';

interface ClientViewProps {
  proposal: Proposal;
  onBack: () => void;
}

export const ClientView: React.FC<ClientViewProps> = ({ proposal, onBack }) => {
  const handlePrint = () => {
    window.print();
  };

  const sections = proposal.sections || {};

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 py-10 px-4 sm:px-8 font-sans print:p-0 print:bg-white">
      {/* Top action bar (hidden in print) */}
      <div className="max-w-4xl mx-auto mb-8 flex items-center justify-between print:hidden">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Proposal Studio</span>
        </button>

        <button
          onClick={handlePrint}
          className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition-colors shadow-sm"
        >
          <Printer className="w-4 h-4" />
          <span>Print / Save to PDF</span>
        </button>
      </div>

      {/* Main Paper Sheet */}
      <main className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-xl p-10 sm:p-16 shadow-xl print:shadow-none print:border-none print:p-0 space-y-10">
        {/* Cover Header */}
        <header className="border-b-2 border-emerald-800/20 pb-8 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-emerald-800 text-white flex items-center justify-center font-bold text-sm">
                K
              </div>
              <span className="font-bold text-emerald-900 tracking-wider text-sm uppercase">Koya Talent</span>
            </div>
            <div className="text-right text-xs text-slate-500 font-mono">
              CONFIDENTIAL PROPOSAL
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-slate-950 pt-4 leading-tight">
            {proposal.title}
          </h1>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-xs">
            <div>
              <span className="text-slate-500 block">Prepared for:</span>
              <strong className="text-slate-900 text-sm">{proposal.company_name}</strong>
              <div className="text-slate-600">{proposal.client_name}</div>
            </div>
            <div>
              <span className="text-slate-500 block">Prepared by:</span>
              <strong className="text-slate-900 text-sm">{proposal.salesperson_name}</strong>
              <div className="text-slate-600">Senior Account Executive, Koya Talent</div>
            </div>
            <div>
              <span className="text-slate-500 block">Date of Agreement:</span>
              <strong className="text-slate-900 text-sm font-mono">{proposal.date_of_call}</strong>
              <div className="text-emerald-700 font-semibold">Verified Solution</div>
            </div>
          </div>
        </header>

        {/* 1. Introduction */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-emerald-950 flex items-center gap-2 border-b border-slate-200 pb-1.5">
            <span className="text-emerald-700 font-mono text-sm">01.</span> Introduction
          </h2>
          <div className="text-slate-800 text-sm leading-relaxed whitespace-pre-wrap">
            {sections.introduction}
          </div>
        </section>

        {/* 2. Project Scope */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-emerald-950 flex items-center gap-2 border-b border-slate-200 pb-1.5">
            <span className="text-emerald-700 font-mono text-sm">02.</span> Project Scope
          </h2>
          <div className="text-slate-800 text-sm leading-relaxed whitespace-pre-wrap">
            {sections.project_scope}
          </div>
        </section>

        {/* 3. Recommended Approach */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-emerald-950 flex items-center gap-2 border-b border-slate-200 pb-1.5">
            <span className="text-emerald-700 font-mono text-sm">03.</span> Recommended Approach
          </h2>
          <div className="text-slate-800 text-sm leading-relaxed whitespace-pre-wrap">
            {sections.recommended_approach}
          </div>
        </section>

        {/* 4. Deliverables */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-emerald-950 flex items-center gap-2 border-b border-slate-200 pb-1.5">
            <span className="text-emerald-700 font-mono text-sm">04.</span> Key Deliverables
          </h2>
          <div className="text-slate-800 text-sm leading-relaxed whitespace-pre-wrap">
            {sections.deliverables}
          </div>
        </section>

        {/* 5. Timeline */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-emerald-950 flex items-center gap-2 border-b border-slate-200 pb-1.5">
            <span className="text-emerald-700 font-mono text-sm">05.</span> Project Timeline
          </h2>
          <div className="text-slate-800 text-sm leading-relaxed whitespace-pre-wrap">
            {sections.timeline}
          </div>
        </section>

        {/* 6. Pricing */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-emerald-950 flex items-center gap-2 border-b border-slate-200 pb-1.5">
            <span className="text-emerald-700 font-mono text-sm">06.</span> Commercial Terms & Pricing
          </h2>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm leading-relaxed whitespace-pre-wrap font-sans">
            {sections.pricing}
          </div>
        </section>

        {/* 7. Next Steps */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-emerald-950 flex items-center gap-2 border-b border-slate-200 pb-1.5">
            <span className="text-emerald-700 font-mono text-sm">07.</span> Next Steps
          </h2>
          <div className="text-slate-800 text-sm leading-relaxed whitespace-pre-wrap">
            {sections.next_steps}
          </div>
        </section>

        {/* Signatures Footer */}
        <footer className="pt-10 border-t-2 border-slate-200 space-y-6">
          <div className="grid grid-cols-2 gap-8 text-xs text-slate-600">
            <div className="space-y-8">
              <div>Accepted for <strong>{proposal.company_name}</strong>:</div>
              <div className="border-b border-slate-400 w-48"></div>
              <div>Authorized Signatory & Date</div>
            </div>
            <div className="space-y-8">
              <div>Accepted for <strong>Koya Talent</strong>:</div>
              <div className="border-b border-slate-400 w-48"></div>
              <div>{proposal.salesperson_name} & Date</div>
            </div>
          </div>
          <div className="text-center text-[11px] text-slate-400 pt-4">
            Koya Talent Inc. • Enterprise Human Capital & Architecture Solutions
          </div>
        </footer>
      </main>
    </div>
  );
};
