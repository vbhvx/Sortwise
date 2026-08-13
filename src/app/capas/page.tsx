'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileCheck2,
  CheckCircle2,
  Clock,
  Filter,
  Plus,
  ArrowRight,
  Download,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';

export default function CapaListPage() {
  const [capas, setCapas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchCapas();
  }, [statusFilter]);

  const fetchCapas = async () => {
    setLoading(true);
    try {
      const url = statusFilter
        ? `/api/v1/capas?status=${statusFilter}`
        : '/api/v1/capas';
      const res = await fetch(url);
      const data = await res.json();
      setCapas(data.capas || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch('/api/v1/exports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'csv', entity: 'capas' }),
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `capa_ledger_${Date.now()}.csv`;
      a.click();
    } catch (e) {
      console.error(e);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CLOSED':
      case 'VERIFIED_EFFECTIVE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'IN_PROGRESS':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'IMPLEMENTED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'EFFECTIVENESS_REVIEW':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'APPROVED':
        return 'bg-cyan-50 text-cyan-800 border-cyan-200';
      default:
        return 'bg-amber-50 text-amber-800 border-amber-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-emerald-600" />
            Corrective & Preventive Actions (CAPA)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Traceable CAPA management under FDA QMSR 21 CFR 820.100 and ISO 13485:2016 Clause 8.5
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExport}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Export CAPA Ledger
          </button>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none"
          >
            <option value="">All Lifecycle Stages</option>
            <option value="PROPOSED">Proposed</option>
            <option value="APPROVED">Approved</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="IMPLEMENTED">Implemented</option>
            <option value="EFFECTIVENESS_REVIEW">Effectiveness Review</option>
            <option value="VERIFIED_EFFECTIVE">Verified Effective</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      </div>

      {/* CAPA List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-brand-600" />
            Loading CAPA records...
          </div>
        ) : capas.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No CAPA records found.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {capas.map((c) => (
              <div
                key={c.id}
                className="p-5 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 pr-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {c.capaNumber}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(
                        c.status
                      )}`}
                    >
                      {c.status.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                      Priority: {c.priority}
                    </span>
                    {c.complaintLinks?.length > 0 && (
                      <span className="text-[10px] text-slate-600 bg-slate-100 px-2 py-0.2 rounded font-medium">
                        Linked Cases: {c.complaintLinks.length}
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-semibold text-slate-900">{c.title}</h3>

                  <p className="text-xs text-slate-600 line-clamp-2">
                    {c.problemStatement}
                  </p>

                  <div className="text-[11px] text-slate-400 flex items-center gap-3">
                    <span>Lead Owner: <b>{c.leadOwner?.fullName}</b></span>
                    <span>•</span>
                    <span>
                      Target Due Date:{' '}
                      <b>
                        {c.targetCompletionDate
                          ? new Date(c.targetCompletionDate).toLocaleDateString()
                          : 'TBD'}
                      </b>
                    </span>
                    <span>•</span>
                    <span>Evidence Items: <b>{c.evidence?.length || 0}</b></span>
                  </div>
                </div>

                <div className="self-end md:self-center">
                  <Link
                    href={`/capas/${c.id}`}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 text-slate-700 transition-colors shadow-2xs flex items-center gap-1.5"
                  >
                    Manage CAPA Workflow
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

