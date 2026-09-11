import React, { useState, useMemo, useEffect } from 'react';
import { Proposal } from '../types';
import { 
  FileText, 
  FileEdit,
  Plus, 
  Clock, 
  CheckCircle2, 
  Send, 
  ArrowRight, 
  Trophy,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  RotateCcw
} from 'lucide-react';

interface ProposalDashboardProps {
  proposals: Proposal[];
  onSelectProposal: (id: string) => void;
  onOpenNewProposal: () => void;
}

type StatusFilterType = 'all' | 'draft' | 'in_review' | 'approved' | 'delivered' | 'accepted' | 'revision_requested';
type SortMetric = 'date_desc' | 'date_asc' | 'company' | 'title' | 'status' | 'version';

export const ProposalDashboard: React.FC<ProposalDashboardProps> = ({
  proposals,
  onSelectProposal,
  onOpenNewProposal
}) => {
  // Interactive state
  const [pageSize, setPageSize] = useState<number | 'all'>(5);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('all');
  const [sortBy, setSortBy] = useState<SortMetric>('date_desc');

  // Compute overall KPI counts
  const totalCount = proposals.length;
  const draftCount = proposals.filter((p) => p.status === 'draft').length;
  const inReviewCount = proposals.filter(
    (p) => p.status === 'pending_approval' || p.status === 'changes_requested' || p.status === 'revision_requested'
  ).length;
  const approvedCount = proposals.filter((p) => p.status === 'approved').length;
  const deliveredCount = proposals.filter((p) => p.status === 'delivered').length;
  const acceptedCount = proposals.filter((p) => p.status === 'accepted').length;

  // Reset to page 1 whenever filters, search or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, sortBy, pageSize]);

  // Handle clicking on a KPI marker card
  const handleMarkerClick = (marker: StatusFilterType) => {
    if (statusFilter === marker) {
      // Clicking the active marker toggles back to all
      setStatusFilter('all');
    } else {
      setStatusFilter(marker);
    }
  };

  // Filter & Sort Pipeline
  const filteredAndSortedProposals = useMemo(() => {
    let result = [...proposals];

    // 1. Status marker filter
    if (statusFilter === 'draft') {
      result = result.filter((p) => p.status === 'draft');
    } else if (statusFilter === 'in_review') {
      result = result.filter(
        (p) => p.status === 'pending_approval' || p.status === 'changes_requested' || p.status === 'revision_requested'
      );
    } else if (statusFilter === 'approved') {
      result = result.filter((p) => p.status === 'approved');
    } else if (statusFilter === 'delivered') {
      result = result.filter((p) => p.status === 'delivered');
    } else if (statusFilter === 'accepted') {
      result = result.filter((p) => p.status === 'accepted');
    } else if (statusFilter === 'revision_requested') {
      result = result.filter((p) => p.status === 'revision_requested');
    }

    // 2. Real-time text search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((p) => {
        const company = (p.company_name || '').toLowerCase();
        const client = (p.client_name || '').toLowerCase();
        const title = (p.title || '').toLowerCase();
        const rep = (p.salesperson_name || '').toLowerCase();
        const id = (p.id || '').toLowerCase();
        return (
          company.includes(q) ||
          client.includes(q) ||
          title.includes(q) ||
          rep.includes(q) ||
          id.includes(q)
        );
      });
    }

    // 3. Multi-metric sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'date_desc': {
          const dateA = new Date(a.created_at || a.date_of_call || 0).getTime();
          const dateB = new Date(b.created_at || b.date_of_call || 0).getTime();
          return dateB - dateA;
        }
        case 'date_asc': {
          const dateA = new Date(a.created_at || a.date_of_call || 0).getTime();
          const dateB = new Date(b.created_at || b.date_of_call || 0).getTime();
          return dateA - dateB;
        }
        case 'company':
          return (a.company_name || '').localeCompare(b.company_name || '');
        case 'title':
          return (a.title || '').localeCompare(b.title || '');
        case 'status':
          return (a.status || '').localeCompare(b.status || '');
        case 'version':
          return (b.version || 1) - (a.version || 1);
        default:
          return 0;
      }
    });

    return result;
  }, [proposals, statusFilter, searchQuery, sortBy]);

  // Pagination calculation
  const totalFiltered = filteredAndSortedProposals.length;
  const effectivePageSize = pageSize === 'all' ? totalFiltered || 1 : pageSize;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / effectivePageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const startIndex = (validCurrentPage - 1) * effectivePageSize;
  const endIndex = pageSize === 'all' ? totalFiltered : Math.min(startIndex + effectivePageSize, totalFiltered);
  const displayedProposals = filteredAndSortedProposals.slice(startIndex, endIndex);

  return (
    <div className="flex-1 bg-slate-50 dark:bg-[#090d16] overflow-y-auto p-6 sm:p-10 custom-scrollbar transition-colors duration-200">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Top Hero / Welcome Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200 dark:bg-[#0f172a] dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm transition-colors">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Enterprise Operations</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Proposal Governance & Studio
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
              Standardized, multi-turn enterprise proposals generated from sales discovery calls with deterministic gap detection and dual-authorization governance.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={onOpenNewProposal}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-semibold text-sm shadow flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Proposal</span>
            </button>
          </div>
        </div>

        {/* Interactive KPI Stat Markers Row */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Filter by Metric Marker
            </span>
            {statusFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white inline-flex items-center gap-1 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Marker Filter</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Total Proposals Marker */}
            <button
              type="button"
              onClick={() => handleMarkerClick('all')}
              className={`text-left rounded-xl p-4 transition-all cursor-pointer border ${
                statusFilter === 'all'
                  ? 'bg-white dark:bg-[#0f172a] border-slate-900 dark:border-white ring-2 ring-slate-900/10 dark:ring-white/20 shadow-sm'
                  : 'bg-white dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 opacity-85 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium mb-1.5">
                <span>Total</span>
                <FileText className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalCount}</div>
              <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">All proposals</div>
            </button>

            {/* Drafts Marker */}
            <button
              type="button"
              onClick={() => handleMarkerClick('draft')}
              className={`text-left rounded-xl p-4 transition-all cursor-pointer border ${
                statusFilter === 'draft'
                  ? 'bg-white dark:bg-[#0f172a] border-slate-500 dark:border-slate-400 ring-2 ring-slate-500/20 shadow-sm'
                  : 'bg-white dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 opacity-85 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium mb-1.5">
                <span>Drafts</span>
                <FileEdit className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              </div>
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">{draftCount}</div>
              <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">In drafting / prep</div>
            </button>

            {/* Awaiting Review Marker */}
            <button
              type="button"
              onClick={() => handleMarkerClick('in_review')}
              className={`text-left rounded-xl p-4 transition-all cursor-pointer border ${
                statusFilter === 'in_review'
                  ? 'bg-white dark:bg-[#0f172a] border-amber-500 dark:border-amber-400 ring-2 ring-amber-500/20 shadow-sm'
                  : 'bg-white dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 opacity-85 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium mb-1.5">
                <span>Awaiting Review</span>
                <Clock className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{inReviewCount}</div>
              <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Manager sign-off queue</div>
            </button>

            {/* Manager Approved Marker */}
            <button
              type="button"
              onClick={() => handleMarkerClick('approved')}
              className={`text-left rounded-xl p-4 transition-all cursor-pointer border ${
                statusFilter === 'approved'
                  ? 'bg-white dark:bg-[#0f172a] border-teal-500 dark:border-teal-400 ring-2 ring-teal-500/20 shadow-sm'
                  : 'bg-white dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 opacity-85 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium mb-1.5">
                <span>Approved</span>
                <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              </div>
              <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">{approvedCount}</div>
              <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Ready for delivery</div>
            </button>

            {/* Client Delivered Marker */}
            <button
              type="button"
              onClick={() => handleMarkerClick('delivered')}
              className={`text-left rounded-xl p-4 transition-all cursor-pointer border ${
                statusFilter === 'delivered'
                  ? 'bg-white dark:bg-[#0f172a] border-blue-500 dark:border-blue-400 ring-2 ring-blue-500/20 shadow-sm'
                  : 'bg-white dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 opacity-85 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium mb-1.5">
                <span>Delivered</span>
                <Send className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{deliveredCount}</div>
              <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Sent to client portal</div>
            </button>

            {/* Accepted Marker */}
            <button
              type="button"
              onClick={() => handleMarkerClick('accepted')}
              className={`text-left rounded-xl p-4 transition-all cursor-pointer border ${
                statusFilter === 'accepted'
                  ? 'bg-white dark:bg-[#0f172a] border-emerald-600 dark:border-emerald-400 ring-2 ring-emerald-500/20 shadow-sm'
                  : 'bg-white dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 opacity-85 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium mb-1.5">
                <span>Accepted</span>
                <Trophy className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{acceptedCount}</div>
              <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Accepted proposals</div>
            </button>
          </div>
        </div>

        {/* Proposals Table Card with Search & Controls Header */}
        <div className="bg-white border border-slate-200 dark:bg-[#0f172a] dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden transition-colors">
          
          {/* Controls Bar: Search, Sort & Filters */}
          <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              
              {/* Left: Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by company, client, title, rep or ID..."
                  className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-white/20 focus:border-slate-400 dark:focus:border-slate-600 transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Right: Sort Dropdown & Page Size Toggle */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Metric Sort Dropdown */}
                <div className="flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortMetric)}
                    className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs rounded-lg px-2.5 py-1.5 font-medium outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
                  >
                    <option value="date_desc">Newest First</option>
                    <option value="date_asc">Oldest First</option>
                    <option value="company">Company Name (A-Z)</option>
                    <option value="title">Proposal Title (A-Z)</option>
                    <option value="status">Status</option>
                    <option value="version">Version (High to Low)</option>
                  </select>
                </div>

                {/* Page Size Segmented Toggle */}
                <div className="flex items-center gap-1.5 pl-2 sm:border-l border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Show:</span>
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-semibold">
                    {[5, 10, 20, 50, 'all'].map((opt) => (
                      <button
                        key={String(opt)}
                        type="button"
                        onClick={() => setPageSize(opt as any)}
                        className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                          pageSize === opt
                            ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white font-bold'
                            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                        }`}
                      >
                        {opt === 'all' ? 'All' : opt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            {/* Active Marker / Search Status Bar */}
            {(statusFilter !== 'all' || searchQuery.trim()) && (
              <div className="flex items-center flex-wrap gap-2 pt-1 text-xs">
                <span className="text-slate-400">Active filters:</span>
                {statusFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 font-medium">
                    <span>Marker: <strong className="capitalize">{statusFilter.replace('_', ' ')}</strong></span>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('all')}
                      className="hover:text-rose-600 cursor-pointer ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {searchQuery.trim() && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 font-medium">
                    <span>Search: <strong>"{searchQuery}"</strong></span>
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="hover:text-rose-600 cursor-pointer ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                <span className="text-slate-500 dark:text-slate-400 text-[11px] ml-auto">
                  Matched <strong>{totalFiltered}</strong> of {totalCount} proposals
                </span>
              </div>
            )}
          </div>

          {/* Proposals List / Table */}
          {displayedProposals.length === 0 ? (
            <div className="p-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                {proposals.length === 0 ? 'No proposals in database' : 'No matching proposals found'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                {proposals.length === 0 
                  ? 'Ready to generate your first proposal? Click the button below to open the intake form.'
                  : 'Try clearing your search query or selecting a different status marker.'}
              </p>
              {proposals.length === 0 ? (
                <button
                  onClick={onOpenNewProposal}
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer"
                >
                  + Create Proposal
                </button>
              ) : (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                  className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Reset All Filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 dark:bg-slate-900/60 dark:text-slate-400 text-xs font-semibold border-b border-slate-100 dark:border-slate-800 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Client / Organization</th>
                    <th className="px-6 py-3">Title</th>
                    <th className="px-6 py-3">Sales Rep</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Version</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300 text-xs">
                  {displayedProposals.map((p) => {
                    const statusBadgeClass =
                      p.status === 'accepted'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-700 font-bold'
                        : p.status === 'approved'
                        ? 'bg-teal-50 text-teal-800 border-teal-300 dark:bg-teal-950/70 dark:text-teal-300 dark:border-teal-700 font-semibold'
                        : p.status === 'delivered'
                        ? 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-700 font-semibold'
                        : p.status === 'pending_approval' || (p.status as string) === 'in_review'
                        ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-700 font-semibold'
                        : p.status === 'changes_requested' || p.status === 'revision_requested'
                        ? 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-700 font-bold'
                        : 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 font-medium';

                    return (
                      <tr 
                        key={p.id}
                        onClick={() => onSelectProposal(p.id)}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                          <div>{p.company_name}</div>
                          <div className="text-[11px] text-slate-400 dark:text-slate-500 font-normal">{p.client_name}</div>
                        </td>
                        <td className="px-6 py-4 max-w-xs truncate font-medium text-slate-800 dark:text-slate-200">
                          {p.title}
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                          {p.salesperson_name}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border capitalize ${statusBadgeClass}`}>
                            {p.status === 'accepted' ? 'Accepted' : p.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-500 dark:text-slate-400">
                          v{p.version}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectProposal(p.id);
                            }}
                            className="text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 font-semibold text-xs inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>Open</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Interactive Pagination Navigation Footer */}
          {totalFiltered > 0 && (
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/30">
              <div>
                Showing <strong className="text-slate-800 dark:text-slate-200">{displayedProposals.length === 0 ? 0 : startIndex + 1}</strong> to{' '}
                <strong className="text-slate-800 dark:text-slate-200">{endIndex}</strong> of{' '}
                <strong className="text-slate-800 dark:text-slate-200">{totalFiltered}</strong> proposals
                {totalFiltered < totalCount && (
                  <span className="text-[11px] text-slate-400 ml-1"> (filtered from {totalCount} total)</span>
                )}
              </div>

              {pageSize !== 'all' && totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={validCurrentPage <= 1}
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-35 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer inline-flex items-center gap-1 font-medium"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Previous</span>
                  </button>

                  <div className="px-2 font-medium text-slate-700 dark:text-slate-300">
                    Page <strong className="text-slate-900 dark:text-white">{validCurrentPage}</strong> of{' '}
                    <strong className="text-slate-900 dark:text-white">{totalPages}</strong>
                  </div>

                  <button
                    type="button"
                    disabled={validCurrentPage >= totalPages}
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-35 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer inline-flex items-center gap-1 font-medium"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

