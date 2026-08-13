'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  ShieldCheck,
  Users,
  Download,
  AlertTriangle,
  FileCheck2,
  Lock,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { ROLE_PERMISSIONS } from '@/lib/auth/rbac';

export default function SettingsAndRegulatoryPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/reports/complaints');
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (entity: 'complaints' | 'capas', format: 'csv' | 'json') => {
    try {
      const res = await fetch('/api/v1/exports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity, format }),
      });
      if (format === 'csv') {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sortwise_${entity}_${Date.now()}.csv`;
        a.click();
      } else {
        const json = await res.json();
        const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sortwise_${entity}_${Date.now()}.json`;
        a.click();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-5 h-5 text-slate-700" />
          Regulatory Applicability Register & Quality Configuration
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Versioned compliance standards, segregation of duties matrix, and audit data export
        </p>
      </div>

      {/* Compliance Disclaimer Notice */}
      <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1.5">
        <div className="flex items-center gap-2 font-bold text-amber-800">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          Regulatory Applicability Notice & Boundaries (Section 13.5)
        </div>
        <p className="leading-relaxed">
          The existence of software workflows alone does not constitute certified FDA or ISO regulatory compliance. 
          Compliance depends on the organization&apos;s approved quality procedures (SOPs), validated installation, 
          qualified personnel, electronic signature verification, and actual operational adherence.
        </p>
      </div>

      {/* Regulatory Register Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Applicability Register (Quality Management System Standards)
        </h2>

        <div className="space-y-3">
          {data?.regulatoryApplicability?.map((reg: any) => (
            <div key={reg.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="font-bold text-slate-900 text-sm">{reg.standardName}</div>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                  {reg.status}
                </span>
              </div>
              <div className="text-slate-600">
                <b>Scope: </b> {reg.industryScope}
              </div>
              <div className="text-slate-500 font-mono text-[11px]">
                <b>Official Reference: </b> {reg.officialReference}
              </div>
              <div className="pt-2 border-t border-slate-200/60">
                <span className="font-bold text-slate-700 block mb-1">Applicable Clauses Implemented:</span>
                <ul className="list-disc pl-5 text-[11px] text-slate-600 space-y-0.5">
                  {(reg.applicableClauses as string[]).map((clause: string, i: number) => (
                    <li key={i}>{clause}</li>
                  ))}
                </ul>
              </div>
              <div className="text-[11px] text-slate-400 pt-1">
                Designated Quality Owner: <b>{reg.complianceOwner}</b> · Reviewed: <b>{new Date(reg.reviewDate).toLocaleDateString()}</b>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Role & Permissions RBAC Matrix */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Users className="w-4 h-4 text-brand-600" />
          Segregation of Duties & RBAC Matrix
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                <th className="py-2.5 px-3">Quality Role</th>
                <th className="py-2.5 px-3">Complaint Intake & Triage</th>
                <th className="py-2.5 px-3">Investigation Workflows</th>
                <th className="py-2.5 px-3">CAPA Creation & Execution</th>
                <th className="py-2.5 px-3">Effectiveness Verification</th>
                <th className="py-2.5 px-3">Case Closure Authority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50/50">
                <td className="py-3 px-3 font-bold text-purple-900">Quality Approver</td>
                <td className="py-3 px-3 text-emerald-600 font-semibold">✓ Full Access</td>
                <td className="py-3 px-3 text-emerald-600 font-semibold">✓ Approve & Close</td>
                <td className="py-3 px-3 text-emerald-600 font-semibold">✓ Approve & Verify</td>
                <td className="py-3 px-3 text-emerald-600 font-bold">✓ Authorized</td>
                <td className="py-3 px-3 text-emerald-600 font-bold">✓ Authorized</td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="py-3 px-3 font-bold text-amber-900">Investigator</td>
                <td className="py-3 px-3 text-emerald-600 font-semibold">✓ Create & Review</td>
                <td className="py-3 px-3 text-emerald-600 font-semibold">✓ Execute Protocols</td>
                <td className="py-3 px-3 text-emerald-600 font-semibold">✓ Propose & Implement</td>
                <td className="py-3 px-3 text-slate-400">✗ Blocked (No self-audit)</td>
                <td className="py-3 px-3 text-slate-400">✗ Blocked</td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="py-3 px-3 font-bold text-blue-900">Complaint Reviewer</td>
                <td className="py-3 px-3 text-emerald-600 font-semibold">✓ Intake & Triage</td>
                <td className="py-3 px-3 text-slate-600">Read-Only</td>
                <td className="py-3 px-3 text-slate-600">Read-Only</td>
                <td className="py-3 px-3 text-slate-400">✗ Blocked</td>
                <td className="py-3 px-3 text-slate-400">✗ Blocked</td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="py-3 px-3 font-bold text-emerald-900">Read-Only Auditor</td>
                <td className="py-3 px-3 text-slate-600">Read-Only</td>
                <td className="py-3 px-3 text-slate-600">Read-Only</td>
                <td className="py-3 px-3 text-slate-600">Read-Only</td>
                <td className="py-3 px-3 text-slate-400">✗ Read-Only</td>
                <td className="py-3 px-3 text-slate-400">✗ Read-Only</td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="py-3 px-3 font-bold text-red-900">Administrator</td>
                <td className="py-3 px-3 text-emerald-600 font-semibold">✓ Full Access</td>
                <td className="py-3 px-3 text-emerald-600 font-semibold">✓ Full Access</td>
                <td className="py-3 px-3 text-emerald-600 font-semibold">✓ Full Access</td>
                <td className="py-3 px-3 text-emerald-600 font-bold">✓ Authorized</td>
                <td className="py-3 px-3 text-emerald-600 font-bold">✓ Authorized</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Data Export & Backup Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Download className="w-4 h-4 text-slate-600" />
          Quality Operations Data Export (Audited)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <span className="font-bold text-xs text-slate-800 block">Complaints Register</span>
            <p className="text-[11px] text-slate-500">
              Export all canonical complaints, original narrative snippets, risk assessments, and status records.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => handleExport('complaints', 'csv')}
                className="px-3 py-1.5 text-xs font-semibold rounded bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 shadow-2xs"
              >
                Export CSV
              </button>
              <button
                onClick={() => handleExport('complaints', 'json')}
                className="px-3 py-1.5 text-xs font-semibold rounded bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 shadow-2xs"
              >
                Export JSON
              </button>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <span className="font-bold text-xs text-slate-800 block">CAPA Master Ledger</span>
            <p className="text-[11px] text-slate-500">
              Export corrective action plans, preventive action plans, effectiveness verification criteria, and closure statuses.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => handleExport('capas', 'csv')}
                className="px-3 py-1.5 text-xs font-semibold rounded bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 shadow-2xs"
              >
                Export CSV
              </button>
              <button
                onClick={() => handleExport('capas', 'json')}
                className="px-3 py-1.5 text-xs font-semibold rounded bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 shadow-2xs"
              >
                Export JSON
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

