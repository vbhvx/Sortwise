'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileText,
  Activity,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  Zap,
  TrendingUp,
  FileSpreadsheet,
  AlertOctagon,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [reportsRes, complaintsRes] = await Promise.all([
        fetch('/api/v1/reports/complaints'),
        fetch('/api/v1/complaints?limit=6'),
      ]);
      const reports = await reportsRes.json();
      const compList = await complaintsRes.json();

      setData(reports);
      setComplaints(compList.complaints || []);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
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
      case 'CLOSED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center space-x-3 text-slate-500 text-sm">
          <RefreshCw className="w-5 h-5 animate-spin text-brand-600" />
          <span>Loading quality intelligence metrics...</span>
        </div>
      </div>
    );
  }

  const m = data?.metrics || {};

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Complaint Quality Intelligence Overview
            <span className="text-xs bg-emerald-100 text-emerald-800 font-medium px-2 py-0.5 rounded-full border border-emerald-200">
              Live Auditable Ledger
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time quality metrics under FDA QMSR 21 CFR 820, 21 CFR 211.198, and ISO 13485:2016
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadDashboardData}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            Refresh
          </button>
          <Link
            href="/complaints/new"
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-brand-600 hover:bg-brand-700 text-white shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Zap className="w-3.5 h-3.5" />
            New Complaint Intake
          </Link>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Intake</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{m.totalComplaints || 0}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">All recorded complaints</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Awaiting Triage</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{m.awaitingTriage || 0}</div>
          <div className="text-[11px] text-amber-600 font-medium mt-0.5">Requires risk evaluation</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs border-l-4 border-l-red-500">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Critical / High</span>
            <AlertOctagon className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-red-700 mt-2">
            {(m.criticalComplaints || 0) + (m.highComplaints || 0)}
          </div>
          <div className="text-[11px] text-red-600 font-medium mt-0.5">Potential safety reportable</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Investigations</span>
            <Activity className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{m.openInvestigations || 0}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">In-flight root cause cases</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Active CAPAs</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{m.openCapas || 0}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Corrective action tracking</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Verified Closed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-2">{m.closedComplaints || 0}</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Approved & verified</div>
        </div>
      </div>

      {/* Main Grid: Urgent Queue + Regulatory & Category distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Urgent Attention Queue (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Active Complaint Review Queue
              </h2>
              <p className="text-xs text-slate-500">
                Prioritized by regulatory severity and review deadlines
              </p>
            </div>
            <Link
              href="/complaints"
              className="text-xs text-brand-600 hover:text-brand-800 font-semibold flex items-center gap-1"
            >
              View All ({m.totalComplaints || 0})
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100 flex-1">
            {complaints.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                No active complaints requiring attention.
              </div>
            ) : (
              complaints.map((c) => (
                <Link
                  key={c.id}
                  href={`/complaints/${c.id}`}
                  className="p-4 flex items-start justify-between hover:bg-slate-50 transition-colors group block"
                >
                  <div className="space-y-1.5 flex-1 pr-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                        {c.complaintNumber}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getPriorityBadge(
                          c.priority
                        )}`}
                      >
                        {c.priority}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${getStatusBadge(
                          c.status
                        )}`}
                      >
                        {c.status.replace(/_/g, ' ')}
                      </span>
                      {c.isSafetyCritical && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-800 border border-red-300 flex items-center gap-1">
                          <AlertOctagon className="w-2.5 h-2.5" />
                          Safety Critical
                        </span>
                      )}
                      {c.isReportable && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                          MDR Reportable
                        </span>
                      )}
                    </div>

                    <div className="text-xs font-semibold text-slate-900 group-hover:text-brand-700 transition-colors">
                      {c.productName}
                      {c.lotNumber && (
                        <span className="text-slate-500 font-normal ml-2">
                          Lot: {c.lotNumber}
                        </span>
                      )}
                      {c.serialNumber && (
                        <span className="text-slate-500 font-normal ml-2">
                          SN: {c.serialNumber}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2">
                      {c.originalDescription}
                    </p>

                    <div className="text-[11px] text-slate-400 flex items-center gap-3">
                      <span>Cat: {c.category}</span>
                      <span>•</span>
                      <span>Assigned: {c.assignedTo?.fullName || 'Unassigned'}</span>
                      <span>•</span>
                      <span>
                        Received: {new Date(c.receivedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all self-center" />
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Category Distribution & Regulatory Checklist */}
        <div className="space-y-6">
          {/* Defect Categories */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
              Defect Category Breakdown
            </h3>
            <div className="space-y-2.5">
              {data?.categoryDistribution?.map((cat: any) => (
                <div key={cat.name} className="text-xs">
                  <div className="flex justify-between text-slate-700 font-medium mb-1">
                    <span className="truncate pr-2">{cat.name}</span>
                    <span className="font-bold text-slate-900">{cat.count}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-brand-600 h-1.5 rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          (cat.count / (m.totalComplaints || 1)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active Regulatory Applicability Register */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Regulatory Register
              </h3>
              <Link
                href="/settings"
                className="text-[11px] text-brand-600 hover:text-brand-800 font-medium"
              >
                Inspect
              </Link>
            </div>
            <div className="space-y-2">
              {data?.regulatoryApplicability?.map((reg: any) => (
                <div
                  key={reg.id}
                  className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 text-xs"
                >
                  <div className="flex items-center justify-between font-semibold text-slate-900">
                    <span>{reg.standardName}</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-300">
                      {reg.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                    {reg.officialReference}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

