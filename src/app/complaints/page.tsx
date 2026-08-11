'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  Plus,
  Download,
  AlertTriangle,
  AlertOctagon,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export default function ComplaintsListPage() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [safetyFilter, setSafetyFilter] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>({ total: 0, totalPages: 1 });

  useEffect(() => {
    fetchComplaints();
  }, [page, statusFilter, priorityFilter, categoryFilter, safetyFilter]);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '10');
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (priorityFilter) params.set('priority', priorityFilter);
      if (categoryFilter) params.set('category', categoryFilter);
      if (safetyFilter) params.set('isSafetyCritical', 'true');

      const res = await fetch(`/api/v1/complaints?${params.toString()}`);
      const data = await res.json();
      setComplaints(data.complaints || []);
      setPagination(data.pagination || { total: 0, totalPages: 1 });
    } catch (err) {
      console.error('Failed to load complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchComplaints();
  };

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const res = await fetch('/api/v1/exports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, entity: 'complaints' }),
      });
      if (format === 'csv') {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `complaints_export_${Date.now()}.csv`;
        a.click();
      } else {
        const json = await res.json();
        const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `complaints_export_${Date.now()}.json`;
        a.click();
      }
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-red-50 text-red-700 border-red-200 ring-1 ring-red-600/20';
      case 'HIGH':
        return 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-600/20';
      case 'MEDIUM':
        return 'bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-600/20';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RECEIVED':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'TRIAGE_REVIEW':
        return 'bg-yellow-50 text-yellow-800 border-yellow-200';
      case 'UNDER_INVESTIGATION':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'CAPA_IN_PROGRESS':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'AWAITING_APPROVAL':
        return 'bg-cyan-50 text-cyan-800 border-cyan-200';
      case 'CLOSED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Complaints Register</h1>
          <p className="text-xs text-slate-500">
            Canonical complaint records with full provenance and audit traceability
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="dropdown relative group">
            <button
              onClick={() => handleExport('csv')}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              Export CSV
            </button>
          </div>
          <Link
            href="/complaints/new"
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-600 hover:bg-brand-700 text-white flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Complaint
          </Link>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by ID, product, lot, serial, reporter, or symptom keywords..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-900 text-white rounded-lg shadow-xs"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
          <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter by:
          </span>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="RECEIVED">Received</option>
            <option value="TRIAGE_REVIEW">Triage Review</option>
            <option value="UNDER_INVESTIGATION">Under Investigation</option>
            <option value="CAPA_IN_PROGRESS">CAPA In Progress</option>
            <option value="AWAITING_APPROVAL">Awaiting Approval</option>
            <option value="CLOSED">Closed</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none"
          >
            <option value="">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none"
          >
            <option value="">All Categories</option>
            <option value="Product Defect">Product Defect</option>
            <option value="Packaging & Sterile Barrier Defect">Packaging & Sterile Barrier</option>
            <option value="Software / Firmware Malfunction">Software / Firmware</option>
            <option value="Particulate & Chemical Contamination">Contamination</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setSafetyFilter(!safetyFilter);
              setPage(1);
            }}
            className={`text-xs px-2.5 py-1 rounded-lg border transition-colors flex items-center gap-1 ${
              safetyFilter
                ? 'bg-red-50 text-red-700 border-red-300 font-semibold'
                : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}
          >
            <AlertOctagon className="w-3 h-3" />
            Safety Critical Only
          </button>

          {(statusFilter || priorityFilter || categoryFilter || safetyFilter || search) && (
            <button
              onClick={() => {
                setStatusFilter('');
                setPriorityFilter('');
                setCategoryFilter('');
                setSafetyFilter(false);
                setSearch('');
                setPage(1);
              }}
              className="text-xs text-brand-600 hover:text-brand-800 font-medium underline ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Complaints Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm flex items-center justify-center space-x-2">
            <RefreshCw className="w-4 h-4 animate-spin text-brand-600" />
            <span>Loading complaints...</span>
          </div>
        ) : complaints.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No complaints match the selected criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Complaint ID</th>
                  <th className="py-3 px-4">Product & Batch</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Safety Flags</th>
                  <th className="py-3 px-4">Received</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {complaints.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-brand-700 whitespace-nowrap">
                      <Link href={`/complaints/${c.id}`} className="hover:underline">
                        {c.complaintNumber}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{c.productName}</div>
                      <div className="text-[11px] text-slate-500">
                        {c.lotNumber ? `Lot: ${c.lotNumber}` : ''}
                        {c.serialNumber ? ` | SN: ${c.serialNumber}` : ''}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                      {c.category}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getPriorityBadge(
                          c.priority
                        )}`}
                      >
                        {c.priority}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${getStatusBadge(
                          c.status
                        )}`}
                      >
                        {c.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {c.isSafetyCritical && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-red-100 text-red-800 border border-red-300">
                            Safety Critical
                          </span>
                        )}
                        {c.isReportable && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                            MDR
                          </span>
                        )}
                        {!c.isSafetyCritical && !c.isReportable && (
                          <span className="text-slate-400 text-[11px]">Routine</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                      {new Date(c.receivedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Link
                        href={`/complaints/${c.id}`}
                        className="px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 bg-white hover:bg-brand-50 hover:text-brand-700 hover:border-brand-300 text-slate-700 transition-colors shadow-2xs"
                      >
                        Review Workspace
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing {(page - 1) * 10 + 1} - {Math.min(page * 10, pagination.total)} of {pagination.total} complaints
          </div>
          <div className="flex items-center space-x-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-2.5 py-1 rounded border border-slate-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 text-slate-700"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-semibold text-slate-700">
              Page {page} of {pagination.totalPages || 1}
            </span>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage(page + 1)}
              className="px-2.5 py-1 rounded border border-slate-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 text-slate-700"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

