'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  History,
  Search,
  Filter,
  Lock,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  FileText,
  AlertTriangle,
} from 'lucide-react';

export default function AuditTrailPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  useEffect(() => {
    fetchAuditEvents();
  }, [page, actionFilter, entityFilter]);

  const fetchAuditEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '15');
      if (actionFilter) params.set('action', actionFilter);
      if (entityFilter) params.set('entityType', entityFilter);

      const res = await fetch(`/api/v1/audit-events?${params.toString()}`);
      const data = await res.json();
      setEvents(data.events || []);
      setPagination(data.pagination || { total: 0, totalPages: 1 });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Lock className="w-5 h-5 text-emerald-600" />
            Immutable Quality Audit Trail
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Durable, tamper-evident record of material quality decisions and status transitions
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={entityFilter}
            onChange={(e) => {
              setEntityFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700"
          >
            <option value="">All Entities</option>
            <option value="Complaint">Complaint</option>
            <option value="Investigation">Investigation</option>
            <option value="Capa">CAPA</option>
            <option value="RiskAssessment">Risk Assessment</option>
          </select>

          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700"
          >
            <option value="">All Actions</option>
            <option value="COMPLAINT_CREATED">Complaint Created</option>
            <option value="STATUS_TRANSITIONED">Status Transitioned</option>
            <option value="FIELD_CORRECTED">Field Corrected</option>
            <option value="RISK_ASSESSED">Risk Assessed</option>
            <option value="RISK_OVERRIDDEN">Risk Overridden</option>
            <option value="INVESTIGATION_APPROVED">Investigation Approved</option>
            <option value="CAPA_CREATED">CAPA Created</option>
            <option value="CAPA_EFFECTIVENESS_VERIFIED">Effectiveness Verified</option>
            <option value="COMPLAINT_CLOSED">Complaint Closed</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-brand-600" />
            Loading audit records...
          </div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No audit records matching the filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Documented Rationale</th>
                  <th className="py-3 px-4 text-right">State Diff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {events.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(evt.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">{evt.actor?.fullName || evt.actorEmail}</div>
                      <div className="text-[10px] text-slate-400">{evt.actorEmail}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-mono text-xs font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                        {evt.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-medium text-slate-800">{evt.entityType}</span>
                      <span className="text-[10px] text-slate-400 font-mono block">
                        {evt.entityId.slice(0, 12)}...
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 max-w-xs truncate">
                      {evt.reason || '—'}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedEvent(evt)}
                        className="px-2 py-1 text-xs font-semibold rounded border border-slate-200 hover:bg-slate-100 text-slate-700 shadow-2xs"
                      >
                        Inspect Diff
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing {(page - 1) * 15 + 1} - {Math.min(page * 15, pagination.total)} of {pagination.total} events
          </div>
          <div className="flex items-center space-x-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-2.5 py-1 rounded border border-slate-200 bg-white disabled:opacity-40"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-semibold text-slate-700">
              Page {page} of {pagination.totalPages || 1}
            </span>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage(page + 1)}
              className="px-2.5 py-1 rounded border border-slate-200 bg-white disabled:opacity-40"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Diff Inspector Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-bold text-slate-900">
                Audit Event State Diff: <code className="text-brand-700">{selectedEvent.action}</code>
              </h3>
              <button onClick={() => setSelectedEvent(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <div className="text-xs space-y-3">
              <div>
                <span className="font-bold text-slate-700 block mb-1">Actor & Timestamp</span>
                <p className="text-slate-600">
                  {selectedEvent.actorEmail} at {new Date(selectedEvent.createdAt).toLocaleString()}
                </p>
              </div>

              {selectedEvent.reason && (
                <div>
                  <span className="font-bold text-slate-700 block mb-1">Documented Reason</span>
                  <p className="p-2 bg-slate-50 rounded border text-slate-800">{selectedEvent.reason}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="font-bold text-slate-700 block mb-1">Previous State</span>
                  <pre className="p-2.5 bg-slate-100 rounded text-[11px] font-mono overflow-x-auto max-h-48 text-slate-700">
                    {selectedEvent.previousState ? JSON.stringify(selectedEvent.previousState, null, 2) : 'null'}
                  </pre>
                </div>

                <div>
                  <span className="font-bold text-slate-700 block mb-1">New State</span>
                  <pre className="p-2.5 bg-slate-100 rounded text-[11px] font-mono overflow-x-auto max-h-48 text-emerald-800">
                    {selectedEvent.newState ? JSON.stringify(selectedEvent.newState, null, 2) : 'null'}
                  </pre>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-1.5 rounded bg-slate-800 text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

