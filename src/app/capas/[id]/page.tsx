'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  FileCheck2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UploadCloud,
  FileText,
  UserCheck,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  X,
  Plus,
  RefreshCw,
} from 'lucide-react';

export default function CapaDetailWorkspace() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [capa, setCapa] = useState<any>(null);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Evidence modal state
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [evidenceForm, setEvidenceForm] = useState({
    title: '',
    description: '',
    phase: 'IMPLEMENTATION',
  });

  // Verification modal state
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationForm, setVerificationForm] = useState({
    effectivenessResults: '',
    isEffective: true,
  });

  // Transition state
  const [submittingAction, setSubmittingAction] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCapa();
    fetchSession();
  }, [id]);

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/v1/auth/session');
      const data = await res.json();
      if (data.session) setSession(data.session);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCapa = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/capas/${id}`);
      const data = await res.json();
      if (data.capa) {
        setCapa(data.capa);
        setApprovals(data.approvals || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleTransition = async (targetStatus: string, rationale?: string) => {
    setSubmittingAction(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/capas/${id}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetStatus,
          rationale: rationale || `Transitioned CAPA to ${targetStatus}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');

      fetchCapa();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleAttachEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/v1/capas/${id}/evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(evidenceForm),
      });
      if (res.ok) {
        setShowEvidenceModal(false);
        setEvidenceForm({ title: '', description: '', phase: 'IMPLEMENTATION' });
        fetchCapa();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/v1/capas/${id}/verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(verificationForm),
      });
      if (res.ok) {
        setShowVerificationModal(false);
        fetchCapa();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading || !capa) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center space-x-3 text-slate-500 text-sm">
          <RefreshCw className="w-5 h-5 animate-spin text-brand-600" />
          <span>Loading CAPA record...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* CAPA Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                {capa.capaNumber}
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full border bg-amber-50 text-amber-800 border-amber-200">
                Stage: {capa.status.replace(/_/g, ' ')}
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-red-100 text-red-800 border border-red-300">
                Priority: {capa.priority}
              </span>
            </div>

            <h1 className="text-lg font-bold text-slate-900 pt-1">{capa.title}</h1>

            <div className="text-xs text-slate-500 flex items-center gap-3">
              <span>Lead Owner: <b>{capa.leadOwner?.fullName}</b></span>
              <span>•</span>
              <span>Target Due Date: <b>{capa.targetCompletionDate ? new Date(capa.targetCompletionDate).toLocaleDateString() : 'N/A'}</b></span>
              <span>•</span>
              <span>Created: <b>{new Date(capa.createdAt).toLocaleDateString()}</b></span>
            </div>
          </div>

          {/* Lifecycle Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {capa.status === 'PROPOSED' && (
              <button
                onClick={() => handleTransition('APPROVED', 'Plan approved by QA leadership.')}
                disabled={submittingAction}
                className="px-3.5 py-1.5 text-xs font-bold bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg shadow-xs"
              >
                Approve Action Plan
              </button>
            )}

            {capa.status === 'APPROVED' && (
              <button
                onClick={() => handleTransition('IN_PROGRESS')}
                disabled={submittingAction}
                className="px-3.5 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs"
              >
                Begin Implementation
              </button>
            )}

            {capa.status === 'IN_PROGRESS' && (
              <>
                <button
                  onClick={() => setShowEvidenceModal(true)}
                  className="px-3 py-1.5 text-xs font-semibold border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5 inline mr-1" />
                  Attach Evidence
                </button>
                <button
                  onClick={() => handleTransition('IMPLEMENTED', 'All corrective actions executed.')}
                  disabled={submittingAction}
                  className="px-3.5 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs"
                >
                  Mark Implemented
                </button>
              </>
            )}

            {capa.status === 'IMPLEMENTED' && (
              <button
                onClick={() => handleTransition('EFFECTIVENESS_REVIEW')}
                disabled={submittingAction}
                className="px-3.5 py-1.5 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-xs"
              >
                Initiate Effectiveness Audit
              </button>
            )}

            {capa.status === 'EFFECTIVENESS_REVIEW' && (
              <button
                onClick={() => setShowVerificationModal(true)}
                className="px-3.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs"
              >
                Record Effectiveness Results
              </button>
            )}

            {capa.status === 'VERIFIED_EFFECTIVE' && (
              <button
                onClick={() => handleTransition('CLOSED', 'Formally verified effective. Closed under QMSR 21 CFR 820.100.')}
                disabled={submittingAction}
                className="px-4 py-1.5 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg shadow-xs flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                Sign & Close CAPA
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-100 text-red-800 rounded-lg text-xs font-medium">
            {error}
          </div>
        )}
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Plans & Evidence */}
        <div className="lg:col-span-2 space-y-6">
          {/* Action Plans */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Root Cause & Action Plans
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-800 block mb-1">Identified Root Cause</span>
                <p className="text-slate-700 leading-relaxed">{capa.identifiedRootCause}</p>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-800 block mb-1">Corrective Action Plan</span>
                <p className="text-slate-700 leading-relaxed">{capa.correctiveActionPlan}</p>
              </div>

              {capa.preventiveActionPlan && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-800 block mb-1">Preventive Action Plan</span>
                  <p className="text-slate-700 leading-relaxed">{capa.preventiveActionPlan}</p>
                </div>
              )}
            </div>
          </div>

          {/* Effectiveness Verification Criteria & Results */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Effectiveness Verification
              </h3>
              <span className="text-[11px] text-slate-500">
                Mandatory for ISO 13485:2016 Clause 8.5.2 & QMSR 820.100
              </span>
            </div>

            <div className="text-xs space-y-3">
              <div>
                <span className="font-bold text-slate-800 block mb-1">Pre-Defined Effectiveness Criteria</span>
                <p className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-700">
                  {capa.effectivenessCriteria}
                </p>
              </div>

              {capa.effectivenessResults ? (
                <div className="p-3.5 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-950 space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <span>Verification Outcome: {capa.isEffective ? 'VERIFIED EFFECTIVE' : 'INEFFECTIVE'}</span>
                    <span className="text-[10px] text-emerald-800">
                      Reviewed: {new Date(capa.effectivenessReviewDate).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-800 pt-1">{capa.effectivenessResults}</p>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-xs">
                  Effectiveness verification audit pending completion of implementation monitoring window.
                </div>
              )}
            </div>
          </div>

          {/* Implementation Evidence */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Action Implementation & Verification Evidence
              </h3>
              <button
                onClick={() => setShowEvidenceModal(true)}
                className="text-xs text-brand-600 hover:text-brand-800 font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Attach Evidence
              </button>
            </div>

            {capa.evidence.length === 0 ? (
              <div className="text-xs text-slate-400 p-6 text-center">
                No evidence documents uploaded yet.
              </div>
            ) : (
              <div className="space-y-2">
                {capa.evidence.map((ev: any) => (
                  <div key={ev.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs flex items-start justify-between">
                    <div>
                      <span className="font-bold text-slate-800">{ev.title}</span>
                      <p className="text-slate-600 mt-0.5">{ev.description}</p>
                      {ev.fileHash && (
                        <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                          Hash: {ev.fileHash.slice(0, 24)}...
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 bg-white px-2 py-0.5 rounded border">
                      {ev.phase}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 col): Linked Complaints & Approvals */}
        <div className="space-y-6">
          {/* Linked Complaints (Bidirectional Traceability) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Originating Complaints
            </h3>
            <div className="space-y-2 text-xs">
              {capa.complaintLinks.map((l: any) => (
                <div key={l.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <Link
                      href={`/complaints/${l.complaint.id}`}
                      className="font-mono text-brand-700 hover:underline"
                    >
                      {l.complaint.complaintNumber}
                    </Link>
                    <span className="text-[10px] font-semibold text-slate-600">
                      {l.complaint.status}
                    </span>
                  </div>
                  <div className="text-slate-800 font-medium">{l.complaint.productName}</div>
                  <p className="text-[11px] text-slate-500 line-clamp-2">
                    {l.complaint.originalDescription}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Formal Electronic Approvals */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Electronic Signature Sign-Off
            </h3>
            {approvals.length === 0 ? (
              <div className="text-xs text-slate-400 p-4 text-center">
                No formal approvals recorded yet.
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                {approvals.map((app: any) => (
                  <div key={app.id} className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-200 space-y-1">
                    <div className="font-bold text-emerald-950 flex items-center justify-between">
                      <span>{app.entityType}</span>
                      <span className="text-[10px] text-emerald-800 font-mono">
                        {new Date(app.signedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="italic text-slate-700">&ldquo;{app.signatureMeaning}&rdquo;</p>
                    <div className="text-[11px] text-slate-500 pt-1">
                      Approver: <b>{app.approver?.fullName}</b>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Attach Evidence */}
      {showEvidenceModal && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-bold text-slate-900">Record Action Evidence</h3>
              <button onClick={() => setShowEvidenceModal(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleAttachEvidence} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Evidence Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Validation Protocol VAL-401 Report"
                  value={evidenceForm.title}
                  onChange={(e) => setEvidenceForm({ ...evidenceForm, title: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phase</label>
                <select
                  value={evidenceForm.phase}
                  onChange={(e) => setEvidenceForm({ ...evidenceForm, phase: e.target.value })}
                  className="w-full p-2 border rounded"
                >
                  <option value="IMPLEMENTATION">Implementation Evidence</option>
                  <option value="VERIFICATION">Effectiveness Verification Evidence</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description & Findings *</label>
                <textarea
                  rows={3}
                  required
                  value={evidenceForm.description}
                  onChange={(e) => setEvidenceForm({ ...evidenceForm, description: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEvidenceModal(false)}
                  className="px-3 py-1.5 rounded border text-slate-600"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 rounded bg-brand-600 text-white font-bold">
                  Save Evidence
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Effectiveness Verification */}
      {showVerificationModal && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-bold text-slate-900">Record Effectiveness Verification</h3>
              <button onClick={() => setShowVerificationModal(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSubmitVerification} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Verification Audit Results & Statistical Evidence *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="e.g. Audit of 10 consecutive lots showed zero seal channel defects. Tensile bond test passed 100%..."
                  value={verificationForm.effectivenessResults}
                  onChange={(e) => setVerificationForm({ ...verificationForm, effectivenessResults: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="effectiveCheck"
                  checked={verificationForm.isEffective}
                  onChange={(e) => setVerificationForm({ ...verificationForm, isEffective: e.target.checked })}
                  className="rounded text-brand-600"
                />
                <label htmlFor="effectiveCheck" className="font-semibold text-slate-800">
                  Certify Action as Effective (Prevents Recurrence)
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowVerificationModal(false)}
                  className="px-3 py-1.5 rounded border text-slate-600"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 rounded bg-emerald-600 text-white font-bold">
                  Certify Verification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

