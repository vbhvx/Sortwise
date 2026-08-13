'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  SearchCode,
  CheckCircle2,
  Clock,
  Filter,
  Plus,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';

export default function InvestigationsListPage() {
  const [investigations, setInvestigations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchInvestigations();
  }, [statusFilter]);

  const fetchInvestigations = async () => {
    setLoading(true);
    try {
      const url = statusFilter
        ? `/api/v1/investigations?status=${statusFilter}`
        : '/api/v1/investigations';
      const res = await fetch(url);
      const data = await res.json();
      setInvestigations(data.investigations || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'IN_PROGRESS':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'PENDING_APPROVAL':
        return 'bg-cyan-50 text-cyan-800 border-cyan-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <SearchCode className="w-5 h-5 text-indigo-600" />
            Failure Analysis & Investigations
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Structured root cause investigations under FDA QMSR 21 CFR 820.198 and ISO 13485
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="COMPLETED">Completed</option>
          </select>
          <button
            onClick={fetchInvestigations}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Investigations List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-brand-600" />
            Loading investigations...
          </div>
        ) : investigations.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No investigations found matching the filter.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {investigations.map((inv) => (
              <div
                key={inv.id}
                className="p-5 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 pr-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      {inv.investigationNumber}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(
                        inv.status
                      )}`}
                    >
                      {inv.status}
                    </span>
                    <Link
                      href={`/complaints/${inv.complaint.id}`}
                      className="font-mono text-[11px] text-brand-700 hover:underline bg-slate-100 px-1.5 py-0.5 rounded"
                    >
                      Linked: {inv.complaint.complaintNumber}
                    </Link>
                    {inv.isRootCauseIdentified && (
                      <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.2 rounded border border-emerald-300">
                        Root Cause Identified
                      </span>
                    )}
                    {inv.capaRequired && (
                      <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.2 rounded border border-amber-300">
                        CAPA Triggered
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-semibold text-slate-900">
                    {inv.complaint.productName} — {inv.scope}
                  </h3>

                  <p className="text-xs text-slate-600 line-clamp-2">
                    {inv.summaryOfFindings || inv.issueStatement}
                  </p>

                  <div className="text-[11px] text-slate-400 flex items-center gap-3">
                    <span>Lead: <b>{inv.leadInvestigator?.fullName}</b></span>
                    <span>•</span>
                    <span>Method: <b>{inv.rootCauseMethod || '5 Whys'}</b></span>
                    <span>•</span>
                    <span>Tasks: <b>{inv.tasks?.length || 0}</b></span>
                    <span>•</span>
                    <span>Hypotheses: <b>{inv.hypotheses?.length || 0}</b></span>
                  </div>
                </div>

                <div className="self-end md:self-center">
                  <Link
                    href={`/complaints/${inv.complaint.id}`}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 text-slate-700 transition-colors shadow-2xs flex items-center gap-1.5"
                  >
                    Open Investigation Workspace
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

