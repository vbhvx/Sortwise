'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  FileText,
  Sparkles,
  Link2,
  SearchCode,
  FileCheck2,
  History,
  Edit3,
  UserCheck,
  ChevronRight,
  ExternalLink,
  Save,
  X,
  Plus,
  Hash,
  Lock,
  ArrowRight,
  Check,
  RefreshCw,
} from 'lucide-react';

export default function ComplaintDetailWorkspace() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [complaint, setComplaint] = useState<any>(null);
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [approvalRecords, setApprovalRecords] = useState<any[]>([]);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'extraction' | 'triage' | 'duplicates' | 'investigation' | 'capa' | 'audit'
  >('overview');

  // Related cases candidates state
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [loadingDuplicates, setLoadingDuplicates] = useState(false);

  // Transition & Action modal state
  const [transitionTarget, setTransitionTarget] = useState<string | null>(null);
  const [transitionRationale, setTransitionRationale] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Editable Canonical Fields State
  const [editingFields, setEditingFields] = useState(false);
  const [editableData, setEditableData] = useState<any>({});

  // Human Risk Override State
  const [overridePriority, setOverridePriority] = useState('');
  const [overrideRationale, setOverrideRationale] = useState('');

  // AI Assistance loading
  const [aiLoading, setAiLoading] = useState(false);
  const [aiGuidance, setAiGuidance] = useState<any>(null);

  // New Investigation modal
  const [showNewInvModal, setShowNewInvModal] = useState(false);
  const [invForm, setInvForm] = useState({
    scope: '',
    issueStatement: '',
    investigationPlan: '',
    rootCauseMethod: 'FIVE_WHYS',
  });

  // New Hypothesis modal
  const [showHypothesisModal, setShowHypothesisModal] = useState(false);
  const [hypothesisForm, setHypothesisForm] = useState({
    method: 'FIVE_WHYS',
    statement: '',
    category: 'MACHINE',
    stepLevel: 1,
  });

  useEffect(() => {
    fetchComplaintData();
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

  const fetchComplaintData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/complaints/${id}`);
      const data = await res.json();
      if (data.complaint) {
        setComplaint(data.complaint);
        setAuditEvents(data.auditEvents || []);
        setApprovalRecords(data.approvalRecords || []);
        setEditableData({
          productName: data.complaint.productName,
          productCode: data.complaint.productCode || '',
          lotNumber: data.complaint.lotNumber || '',
          serialNumber: data.complaint.serialNumber || '',
          category: data.complaint.category,
          reportedImpact: data.complaint.reportedImpact || '',
        });
        setOverridePriority(data.complaint.priority);
      }
    } catch (err) {
      console.error('Failed to load complaint:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDuplicateCandidates = async () => {
    setLoadingDuplicates(true);
    try {
      const res = await fetch(`/api/v1/complaints/${id}/related`);
      const data = await res.json();
      setDuplicates(data.candidates || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDuplicates(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'duplicates' && duplicates.length === 0) {
      loadDuplicateCandidates();
    }
  }, [activeTab]);

  // Handle State Transition
  const handleTransitionSubmit = async () => {
    if (!transitionTarget) return;
    setSubmittingAction(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/v1/complaints/${id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetStatus: transitionTarget,
          rationale: transitionRationale,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Transition failed');

      setTransitionTarget(null);
      setTransitionRationale('');
      fetchComplaintData();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Save Edited Canonical Fields
  const handleSaveFields = async () => {
    try {
      const res = await fetch(`/api/v1/complaints/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editableData),
      });
      const data = await res.json();
      if (res.ok) {
        setEditingFields(false);
        fetchComplaintData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Submit Human Risk Override
  const handleRiskOverride = async () => {
    setActionError(null);
    try {
      const res = await fetch(`/api/v1/complaints/${id}/triage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          finalPriority: overridePriority,
          overrideRationale,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Override failed');

      setOverrideRationale('');
      fetchComplaintData();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  // Confirm / Reject Duplicate Relationship
  const handleRelationshipReview = async (targetId: string, reviewStatus: string, relType: string) => {
    try {
      const res = await fetch(`/api/v1/complaints/${id}/relationships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetComplaintId: targetId,
          relationshipType: relType,
          reviewStatus,
          rationale: `Reviewer marked status as ${reviewStatus}`,
        }),
      });
      if (res.ok) {
        fetchComplaintData();
        loadDuplicateCandidates();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Create Investigation
  const handleCreateInvestigation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/investigations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complaintId: complaint.id,
          ...invForm,
        }),
      });
      if (res.ok) {
        setShowNewInvModal(false);
        fetchComplaintData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Add Root Cause Hypothesis
  const handleAddHypothesis = async (e: React.FormEvent) => {
    e.preventDefault();
    const inv = complaint.investigations?.[0];
    if (!inv) return;
    try {
      const res = await fetch(`/api/v1/investigations/${inv.id}/hypotheses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hypothesisForm),
      });
      if (res.ok) {
        setShowHypothesisModal(false);
        setHypothesisForm({ method: 'FIVE_WHYS', statement: '', category: 'MACHINE', stepLevel: 1 });
        fetchComplaintData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Verify Hypothesis to Verified Finding
  const handleVerifyHypothesis = async (hypothesisId: string) => {
    const inv = complaint.investigations?.[0];
    if (!inv) return;
    try {
      await fetch(`/api/v1/investigations/${inv.id}/hypotheses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hypothesisId,
          status: 'VERIFIED_FINDING',
          supportingEvidence: 'Verified by failure analysis engineer against laboratory records.',
        }),
      });
      fetchComplaintData();
    } catch (e) {
      console.error(e);
    }
  };

  // Request AI Investigation Guidance
  const handleRunAiGuidance = async () => {
    setAiLoading(true);
    try {
      const res = await fetch('/api/v1/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'ROOT_CAUSE_ASSISTANCE',
          inputData: {
            productName: complaint.productName,
            category: complaint.category,
            description: complaint.originalDescription,
            lotNumber: complaint.lotNumber,
          },
        }),
      });
      const data = await res.json();
      if (data.data) {
        setAiGuidance(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoading(false);
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

  if (loading || !complaint) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center space-x-3 text-slate-500 text-sm">
          <RefreshCw className="w-5 h-5 animate-spin text-brand-600" />
          <span>Loading complaint workspace...</span>
        </div>
      </div>
    );
  }

  const latestExtraction = complaint.extractions?.[0];
  const latestRisk = complaint.riskAssessments?.[0];
  const activeInvestigation = complaint.investigations?.[0];
  const linkedCapas = complaint.capaLinks || [];

  return (
    <div className="space-y-6">
      {/* Workspace Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-base font-bold text-brand-800 bg-brand-50 px-2.5 py-0.5 rounded-lg border border-brand-200">
                {complaint.complaintNumber}
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getPriorityBadge(
                  complaint.priority
                )}`}
              >
                {complaint.priority}
              </span>
              <span
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-md border ${getStatusBadge(
                  complaint.status
                )}`}
              >
                {complaint.status.replace(/_/g, ' ')}
              </span>

              {complaint.isSafetyCritical && (
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-red-100 text-red-800 border border-red-300 flex items-center gap-1">
                  <AlertOctagon className="w-3 h-3 text-red-600" />
                  Safety Critical
                </span>
              )}
              {complaint.isReportable && (
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                  MDR Suspected
                </span>
              )}
            </div>

            <h1 className="text-lg font-bold text-slate-900 pt-0.5">
              {complaint.productName}
              {complaint.lotNumber && (
                <span className="text-slate-500 font-mono text-sm ml-2">
                  (Lot: {complaint.lotNumber})
                </span>
              )}
              {complaint.serialNumber && (
                <span className="text-slate-500 font-mono text-sm ml-2">
                  (SN: {complaint.serialNumber})
                </span>
              )}
            </h1>

            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>Category: <b>{complaint.category}</b></span>
              <span>•</span>
              <span>Impact: <b>{complaint.reportedImpact || 'Unspecified'}</b></span>
              <span>•</span>
              <span>Assigned: <b>{complaint.assignedTo?.fullName || 'Unassigned'}</b></span>
              <span>•</span>
              <span>Received: <b>{new Date(complaint.receivedAt).toLocaleDateString()}</b></span>
            </div>
          </div>

          {/* Workflow Transition Buttons */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
            {complaint.status === 'RECEIVED' && (
              <button
                onClick={() => setTransitionTarget('TRIAGE_REVIEW')}
                className="px-3 py-1.5 text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-lg shadow-xs transition-colors"
              >
                Submit for Triage
              </button>
            )}

            {complaint.status === 'TRIAGE_REVIEW' && (
              <>
                <button
                  onClick={() => {
                    setInvForm({
                      scope: `Formal failure analysis for ${complaint.productName} Lot ${complaint.lotNumber || 'Unknown'}`,
                      issueStatement: complaint.normalizedDescription || complaint.originalDescription.slice(0, 200),
                      investigationPlan: 'DHR review, retain sample inspection, and functional test execution.',
                      rootCauseMethod: 'FIVE_WHYS',
                    });
                    setShowNewInvModal(true);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <SearchCode className="w-3.5 h-3.5" />
                  Initiate Investigation
                </button>
                <button
                  onClick={() => setTransitionTarget('CLOSED')}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white rounded-lg shadow-xs transition-colors"
                >
                  Close (No Investigation Needed)
                </button>
              </>
            )}

            {complaint.status === 'UNDER_INVESTIGATION' && (
              <button
                onClick={() => setTransitionTarget('AWAITING_APPROVAL')}
                className="px-3 py-1.5 text-xs font-semibold bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
              >
                Submit for Quality Approval
              </button>
            )}

            {complaint.status === 'AWAITING_APPROVAL' && (
              <button
                onClick={() => setTransitionTarget('CLOSED')}
                className="px-3.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Approve & Close Complaint
              </button>
            )}

            {complaint.status === 'CLOSED' && (
              <button
                onClick={() => setTransitionTarget('REOPENED')}
                className="px-3 py-1.5 text-xs font-semibold border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg shadow-xs transition-colors"
              >
                Reopen Case (With Rationale)
              </button>
            )}
          </div>
        </div>

        {/* Transition Dialog Modal */}
        {transitionTarget && (
          <div className="p-4 rounded-xl border border-brand-200 bg-brand-50/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Confirm State Transition to: <code className="text-brand-700">{transitionTarget}</code>
              </span>
              <button onClick={() => setTransitionTarget(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {actionError && (
              <div className="p-2.5 bg-red-100 text-red-800 rounded-md text-xs font-medium">
                {actionError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Documented Decision Rationale * (Mandatory for audit trail & electronic sign-off)
              </label>
              <textarea
                rows={2}
                value={transitionRationale}
                onChange={(e) => setTransitionRationale(e.target.value)}
                placeholder="Enter regulatory justification or closure findings rationale..."
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-mono"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setTransitionTarget(null)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleTransitionSubmit}
                disabled={submittingAction}
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-brand-600 hover:bg-brand-700 text-white shadow-xs"
              >
                {submittingAction ? 'Signing & Verifying...' : 'Sign & Apply Transition'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Workspace Navigation Tabs */}
      <div className="flex border-b border-slate-200 space-x-1 overflow-x-auto text-xs font-medium">
        {[
          { id: 'overview', label: '1. Source Evidence & Canonical Record', icon: FileText },
          { id: 'extraction', label: '2. AI Extraction & Citations', icon: Sparkles },
          { id: 'triage', label: '3. Risk Triage & Overrides', icon: AlertTriangle },
          { id: 'duplicates', label: '4. Duplicate / Related Cases', icon: Link2 },
          { id: 'investigation', label: '5. Investigation & Root Cause', icon: SearchCode },
          { id: 'capa', label: '6. CAPA Traceability', icon: FileCheck2 },
          { id: 'audit', label: '7. Approvals & Audit Trail', icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-1.5 py-2.5 px-3.5 border-b-2 whitespace-nowrap transition-colors ${
                isActive
                  ? 'border-brand-600 text-brand-700 font-bold bg-brand-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT AREAS */}

      {/* TAB 1: Source Evidence & Canonical Record */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Untouched Original Source Record */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center space-x-2">
                <Lock className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Original Source Record (Immutable)
                </h3>
              </div>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Tamper-Evident Source
              </span>
            </div>

            <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
              <span>Source System: <b>{complaint.source?.sourceSystem || 'web_intake'}</b></span>
              <span>Ingested: <b>{new Date(complaint.receivedAt).toLocaleString()}</b></span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-800 font-mono whitespace-pre-wrap leading-relaxed">
              {complaint.originalDescription}
            </div>

            {complaint.source?.contentHash && (
              <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                <Hash className="w-3 h-3 text-slate-400" />
                <span>SHA-256: </span>
                <span className="truncate">{complaint.source.contentHash}</span>
              </div>
            )}
          </div>

          {/* Right: Canonical Structured Fields */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Canonical Quality Attributes
              </h3>
              {!editingFields ? (
                <button
                  onClick={() => setEditingFields(true)}
                  className="text-xs text-brand-600 hover:text-brand-800 font-semibold flex items-center gap-1"
                >
                  <Edit3 className="w-3 h-3" /> Edit Fields
                </button>
              ) : (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setEditingFields(false)}
                    className="text-xs text-slate-500 hover:text-slate-700 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveFields}
                    className="px-2.5 py-1 text-xs font-semibold rounded bg-brand-600 text-white flex items-center gap-1"
                  >
                    <Save className="w-3 h-3" /> Save Changes
                  </button>
                </div>
              )}
            </div>

            {editingFields ? (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Product Name</label>
                  <input
                    type="text"
                    value={editableData.productName}
                    onChange={(e) => setEditableData({ ...editableData, productName: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Lot / Batch</label>
                    <input
                      type="text"
                      value={editableData.lotNumber}
                      onChange={(e) => setEditableData({ ...editableData, lotNumber: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Serial Number</label>
                    <input
                      type="text"
                      value={editableData.serialNumber}
                      onChange={(e) => setEditableData({ ...editableData, serialNumber: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Category</label>
                  <input
                    type="text"
                    value={editableData.category}
                    onChange={(e) => setEditableData({ ...editableData, category: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Reported Impact</label>
                  <input
                    type="text"
                    value={editableData.reportedImpact}
                    onChange={(e) => setEditableData({ ...editableData, reportedImpact: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Product</span>
                  <span className="font-semibold text-slate-900">{complaint.productName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Product Code / REF</span>
                  <span className="font-mono text-slate-900">{complaint.productCode || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Batch / Lot</span>
                  <span className="font-mono font-bold text-slate-900">{complaint.lotNumber || 'UNKNOWN'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Device Serial</span>
                  <span className="font-mono font-bold text-slate-900">{complaint.serialNumber || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Classification Category</span>
                  <span className="font-medium text-slate-900">{complaint.category}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Clinical Impact</span>
                  <span className="font-medium text-slate-900">{complaint.reportedImpact || 'Unspecified'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Reporter</span>
                  <span className="font-medium text-slate-900">{complaint.complainantName || 'Anonymous'}</span>
                  {complaint.complainantContact && (
                    <span className="text-[11px] text-slate-500 block">{complaint.complainantContact}</span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">External Reference</span>
                  <span className="font-mono text-slate-900">{complaint.externalReference || 'None'}</span>
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                Normalized Structured Statement
              </span>
              <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed">
                {complaint.normalizedDescription || 'Normalized summary generated from source report.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AI Extraction & Citations */}
      {activeTab === 'extraction' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-600" />
                Evidence-Preserving Extraction & Provenance
              </h3>
              <p className="text-xs text-slate-500">
                Extracted candidate fields linked directly to original text citations
              </p>
            </div>
            {latestExtraction && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
                Confidence: {((latestExtraction.confidence || 0.9) * 100).toFixed(0)}%
              </span>
            )}
          </div>

          {latestExtraction ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(latestExtraction.extractedFields || {})
                  .filter(([k]) => k !== 'citations')
                  .map(([key, val]: any) => (
                    <div key={key} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">{key}</span>
                      <span className="text-xs font-semibold text-slate-900 block mt-1">
                        {typeof val === 'string' ? val : JSON.stringify(val)}
                      </span>
                    </div>
                  ))}
              </div>

              {/* Citations Grounded in Source Text */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Text Spans & Citations
                </h4>
                <div className="space-y-1.5">
                  {(latestExtraction.extractedFields?.citations || []).length === 0 ? (
                    <div className="text-xs text-slate-500">No explicit text spans recorded.</div>
                  ) : (
                    (latestExtraction.extractedFields?.citations || []).map((c: any, idx: number) => (
                      <div key={idx} className="text-xs flex items-start gap-2 bg-white p-2 rounded border border-slate-200 font-mono">
                        <span className="font-bold text-brand-700">{c.field}:</span>
                        <span className="text-slate-700">&ldquo;{c.citationText}&rdquo;</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Missing Information Alerts */}
              {latestExtraction.missingFields && (latestExtraction.missingFields as any[]).length > 0 && (
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-1.5">
                  <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Missing Information Flags
                  </h4>
                  <ul className="list-disc pl-5 text-xs text-amber-900 space-y-0.5">
                    {(latestExtraction.missingFields as string[]).map((msg, i) => (
                      <li key={i}>{msg}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-slate-500 p-8 text-center">
              No extraction record on file for this complaint.
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Risk Triage & Overrides */}
      {activeTab === 'triage' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Regulatory Risk Evaluation (5-Factor Framework)
                </h3>
                <p className="text-xs text-slate-500">
                  Calculated against FDA QMSR 21 CFR 820 & ISO 13485 post-market surveillance criteria
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full border ${getPriorityBadge(
                    complaint.priority
                  )}`}
                >
                  Final Priority: {complaint.priority}
                </span>
              </div>
            </div>

            {latestRisk ? (
              <div className="space-y-4">
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed">
                  <b>Evaluation Rationale: </b>
                  {latestRisk.rationale}
                </div>

                {/* Factors Considered */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Factors Analyzed
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {(Array.isArray(latestRisk.factorsConsidered)
                      ? latestRisk.factorsConsidered
                      : Object.entries(latestRisk.factorsConsidered || {})
                    ).map((f: any, idx: number) => {
                      const name = f.name || f[0];
                      const triggered = f.triggered ?? true;
                      const rationale = f.rationale || JSON.stringify(f[1]);
                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg border ${
                            triggered
                              ? 'bg-red-50/50 border-red-200 text-red-900'
                              : 'bg-slate-50 border-slate-200 text-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold">
                            <span>{name}</span>
                            <span className="text-[10px] uppercase">
                              {triggered ? 'TRIGGERED' : 'NOT FOUND'}
                            </span>
                          </div>
                          <p className="text-[11px] mt-1 text-slate-700">{rationale}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 p-8 text-center">
                No automated risk assessment on record.
              </div>
            )}
          </div>

          {/* Human Reviewer Override Section */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-brand-600" />
                Human Reviewer Override & Decision Record
              </h3>
              <span className="text-[11px] text-slate-400">
                Audited under 21 CFR Part 11
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Adjust Priority
                </label>
                <select
                  value={overridePriority}
                  onChange={(e) => setOverridePriority(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-slate-50 font-bold"
                >
                  <option value="CRITICAL">CRITICAL (24h Review)</option>
                  <option value="HIGH">HIGH (48h Review)</option>
                  <option value="MEDIUM">MEDIUM (72h Review)</option>
                  <option value="LOW">LOW (120h Review)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Documented Override Rationale * (Mandatory when overriding AI rating)
                </label>
                <input
                  type="text"
                  placeholder="State clinical reasoning or why risk was re-classified..."
                  value={overrideRationale}
                  onChange={(e) => setOverrideRationale(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={handleRiskOverride}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-900 text-white shadow-xs transition-colors"
              >
                Submit Risk Decision & Audit Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Duplicate & Related Cases */}
      {activeTab === 'duplicates' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Link2 className="w-4 h-4 text-brand-600" />
                Duplicate & Related Case Intelligence
              </h3>
              <p className="text-xs text-slate-500">
                Surfaces candidate matches using exact identifiers and symptom overlap without automatic record deletion
              </p>
            </div>
            <button
              onClick={loadDuplicateCandidates}
              className="px-3 py-1 text-xs font-medium rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Re-scan Candidates
            </button>
          </div>

          {loadingDuplicates ? (
            <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-brand-600" />
              Scanning active complaint ledger for matching signatures...
            </div>
          ) : duplicates.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No duplicate or related candidates found matching this complaint.
            </div>
          ) : (
            <div className="space-y-4">
              {duplicates.map((cand) => (
                <div
                  key={cand.targetComplaintId}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-brand-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {cand.targetComplaintNumber}
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        Match Score: {(cand.similarityScore * 100).toFixed(0)}%
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                        {cand.relationshipType.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() =>
                          handleRelationshipReview(
                            cand.targetComplaintId,
                            'CONFIRMED_BY_REVIEWER',
                            'CONFIRMED_DUPLICATE'
                          )
                        }
                        className="px-2.5 py-1 text-xs font-semibold rounded bg-brand-600 hover:bg-brand-700 text-white shadow-2xs"
                      >
                        Confirm Duplicate
                      </button>
                      <button
                        onClick={() =>
                          handleRelationshipReview(
                            cand.targetComplaintId,
                            'CONFIRMED_BY_REVIEWER',
                            'RELATED_COMPLAINT'
                          )
                        }
                        className="px-2.5 py-1 text-xs font-semibold rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
                      >
                        Link as Related
                      </button>
                      <button
                        onClick={() =>
                          handleRelationshipReview(
                            cand.targetComplaintId,
                            'REJECTED_BY_REVIEWER',
                            'UNRELATED'
                          )
                        }
                        className="px-2 py-1 text-xs text-slate-400 hover:text-red-600"
                      >
                        Reject
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {cand.rationale}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 text-[11px]">
                    {cand.signals.map((sig: any, idx: number) => (
                      <div
                        key={idx}
                        className={`p-1.5 rounded flex items-center justify-between ${
                          sig.matched ? 'bg-emerald-50 text-emerald-900' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        <span className="font-semibold">{sig.criteriaName}</span>
                        <span>{sig.matched ? 'MATCHED' : 'NO MATCH'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: Investigation & Root Cause */}
      {activeTab === 'investigation' && (
        <div className="space-y-6">
          {!activeInvestigation ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center space-y-3">
              <SearchCode className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900">No Investigation Initiated</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Under QMSR 21 CFR 820.198, complaints involving adverse events, malfunction, or safety risks require formal failure investigations.
              </p>
              <button
                onClick={() => {
                  setInvForm({
                    scope: `Failure analysis for ${complaint.productName}`,
                    issueStatement: complaint.normalizedDescription || complaint.originalDescription,
                    investigationPlan: 'Quarantine retains, inspect DHR, and test returned physical sample.',
                    rootCauseMethod: 'FIVE_WHYS',
                  });
                  setShowNewInvModal(true);
                }}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-brand-600 hover:bg-brand-700 text-white shadow-xs"
              >
                Initiate Formal Investigation
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Investigation Header */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        {activeInvestigation.investigationNumber}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900">
                        Root Cause Investigation Workspace
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Lead Investigator: <b>{activeInvestigation.leadInvestigator?.fullName}</b>
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                        activeInvestigation.status === 'COMPLETED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      }`}
                    >
                      Status: {activeInvestigation.status}
                    </span>
                    <button
                      onClick={handleRunAiGuidance}
                      disabled={aiLoading}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-brand-200 bg-brand-50 hover:bg-brand-100 text-brand-700 flex items-center gap-1.5 shadow-2xs"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {aiLoading ? 'Synthesizing...' : 'AI Investigation Guidance'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Scope of Investigation</span>
                    <p className="text-slate-800 font-medium mt-0.5">{activeInvestigation.scope}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Issue Statement</span>
                    <p className="text-slate-800 font-medium mt-0.5">{activeInvestigation.issueStatement}</p>
                  </div>
                </div>

                {/* AI Guidance Accordion */}
                {aiGuidance && (
                  <div className="p-4 rounded-xl border border-brand-200 bg-brand-50/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-brand-800 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        AI Advisory Investigation Guidance (Hypothesis Generation Only)
                      </span>
                      <button onClick={() => setAiGuidance(null)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="text-xs text-slate-700 space-y-2">
                      <p><b>Suggested Investigation Plan:</b> {aiGuidance.investigationPlanSuggestion}</p>
                      <div>
                        <b>Key Unanswered Questions to Resolve:</b>
                        <ul className="list-disc pl-5 mt-1 space-y-0.5 text-slate-600">
                          {aiGuidance.keyUnansweredQuestions?.map((q: string, i: number) => (
                            <li key={i}>{q}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 5 Whys & Fishbone Hypotheses Ledger */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <SearchCode className="w-4 h-4 text-brand-600" />
                      Root-Cause Analysis Tree (Hypotheses vs Verified Findings)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Hypotheses require verified objective evidence before adoption into findings
                    </p>
                  </div>

                  <button
                    onClick={() => setShowHypothesisModal(true)}
                    className="px-3 py-1 text-xs font-semibold rounded-lg bg-brand-600 hover:bg-brand-700 text-white flex items-center gap-1 shadow-2xs"
                  >
                    <Plus className="w-3 h-3" />
                    Add Hypothesis / Why Step
                  </button>
                </div>

                <div className="space-y-3">
                  {(!activeInvestigation.hypotheses || activeInvestigation.hypotheses.length === 0) ? (
                    <div className="text-xs text-slate-400 p-6 text-center">
                      No root-cause hypotheses documented yet.
                    </div>
                  ) : (
                    activeInvestigation.hypotheses.map((hyp: any, idx: number) => {
                      const isVerified = hyp.status === 'VERIFIED_FINDING';
                      return (
                        <div
                          key={hyp.id}
                          className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                            isVerified
                              ? 'bg-emerald-50/50 border-emerald-200'
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono font-bold text-[10px] text-slate-500">
                                {hyp.method} {hyp.stepLevel ? `Level ${hyp.stepLevel}` : ''} {hyp.category ? `[${hyp.category}]` : ''}
                              </span>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                                  isVerified
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                    : 'bg-amber-100 text-amber-800 border-amber-300'
                                }`}
                              >
                                {hyp.status.replace(/_/g, ' ')}
                              </span>
                            </div>

                            {!isVerified && (
                              <button
                                onClick={() => handleVerifyHypothesis(hyp.id)}
                                className="px-2 py-0.5 text-[11px] font-semibold text-emerald-700 bg-white border border-emerald-300 hover:bg-emerald-50 rounded shadow-2xs"
                              >
                                Certify as Verified Finding
                              </button>
                            )}
                          </div>

                          <p className="font-semibold text-slate-900">{hyp.statement}</p>
                          {hyp.supportingEvidence && (
                            <p className="text-[11px] text-slate-600 font-mono bg-white p-2 rounded border border-slate-200">
                              Evidence: {hyp.supportingEvidence}
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Final Root Cause Conclusion */}
                {activeInvestigation.rootCauseConclusion && (
                  <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50 text-xs space-y-1">
                    <span className="font-bold text-emerald-900 uppercase text-[10px] tracking-wider block">
                      Approved Root Cause Determination
                    </span>
                    <p className="text-emerald-950 font-medium leading-relaxed">
                      {activeInvestigation.rootCauseConclusion}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: CAPA Traceability */}
      {activeTab === 'capa' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-emerald-600" />
                Corrective and Preventive Action (CAPA) Linkage
              </h3>
              <p className="text-xs text-slate-500">
                Bidirectional traceability from originating complaint to verified preventive action
              </p>
            </div>
            <Link
              href="/capas"
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-600 hover:bg-brand-700 text-white shadow-xs"
            >
              Open CAPA Master Ledger
            </Link>
          </div>

          {linkedCapas.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs space-y-2">
              <FileCheck2 className="w-8 h-8 text-slate-300 mx-auto" />
              <p>No CAPAs linked to this complaint yet.</p>
              <p className="text-[11px] text-slate-400">
                If the failure investigation identifies systemic root causes, initiate a formal CAPA record.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {linkedCapas.map((link: any) => {
                const capa = link.capa;
                return (
                  <div
                    key={capa.id}
                    className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-brand-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {capa.capaNumber}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900">{capa.title}</h4>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                        {capa.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="text-xs text-slate-700 space-y-1.5">
                      <p><b>Identified Root Cause:</b> {capa.identifiedRootCause}</p>
                      <p><b>Corrective Action Plan:</b> {capa.correctiveActionPlan}</p>
                      <p><b>Effectiveness Criteria:</b> {capa.effectivenessCriteria}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Lead Owner: {capa.leadOwner?.fullName}</span>
                      <Link
                        href={`/capas/${capa.id}`}
                        className="text-brand-600 hover:text-brand-800 font-semibold flex items-center gap-1"
                      >
                        Inspect CAPA Record & Evidence <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 7: Approvals & Audit Trail */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          {/* Formal Electronic Approvals */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Formal Electronic Signatures (21 CFR Part 11)
            </h3>
            {approvalRecords.length === 0 ? (
              <div className="text-xs text-slate-400 p-4 text-center">
                No formal closure or investigation signatures recorded yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {approvalRecords.map((app) => (
                  <div key={app.id} className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/40 text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-emerald-950">
                      <span>{app.entityType} - {app.decision}</span>
                      <span className="text-[10px] font-mono text-emerald-800">
                        {new Date(app.signedAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-800 italic">&ldquo;{app.signatureMeaning}&rdquo;</p>
                    <div className="text-[11px] text-slate-500 pt-1">
                      Signed by: <b>{app.approver?.fullName}</b> ({app.approver?.title || app.approver?.email})
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chronological Audit Event Ledger */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <History className="w-4 h-4 text-slate-500" />
              Immutable Lifecycle Audit Trail
            </h3>

            <div className="space-y-3">
              {auditEvents.map((evt) => (
                <div key={evt.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-800 font-semibold">
                    <span className="font-mono text-brand-700">{evt.action}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(evt.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Actor: <b>{evt.actorEmail}</b>
                  </div>
                  {evt.reason && (
                    <div className="text-[11px] text-slate-700 bg-white p-2 rounded border border-slate-200">
                      <b>Rationale / Details: </b> {evt.reason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Investigation */}
      {showNewInvModal && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-bold text-slate-900">Initiate Failure Investigation</h3>
              <button onClick={() => setShowNewInvModal(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleCreateInvestigation} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Investigation Scope *</label>
                <input
                  type="text"
                  required
                  value={invForm.scope}
                  onChange={(e) => setInvForm({ ...invForm, scope: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Issue Statement *</label>
                <textarea
                  rows={2}
                  required
                  value={invForm.issueStatement}
                  onChange={(e) => setInvForm({ ...invForm, issueStatement: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Investigation Protocol Plan *</label>
                <textarea
                  rows={3}
                  required
                  value={invForm.investigationPlan}
                  onChange={(e) => setInvForm({ ...invForm, investigationPlan: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewInvModal(false)}
                  className="px-3 py-1.5 rounded border text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-brand-600 text-white font-bold"
                >
                  Create Investigation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Hypothesis */}
      {showHypothesisModal && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-bold text-slate-900">Add Root-Cause Hypothesis</h3>
              <button onClick={() => setShowHypothesisModal(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleAddHypothesis} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Methodology</label>
                <select
                  value={hypothesisForm.method}
                  onChange={(e) => setHypothesisForm({ ...hypothesisForm, method: e.target.value })}
                  className="w-full p-2 border rounded"
                >
                  <option value="FIVE_WHYS">5 Whys Analysis</option>
                  <option value="FISHBONE_6M">Fishbone (6M Cause-and-Effect)</option>
                  <option value="HYPOTHESIS_TESTING">Evidence-Based Hypothesis</option>
                </select>
              </div>
              {hypothesisForm.method === 'FISHBONE_6M' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">6M Category</label>
                  <select
                    value={hypothesisForm.category}
                    onChange={(e) => setHypothesisForm({ ...hypothesisForm, category: e.target.value })}
                    className="w-full p-2 border rounded"
                  >
                    <option value="MACHINE">Machine / Hardware</option>
                    <option value="MATERIAL">Material / Raw Substrate</option>
                    <option value="METHOD">Method / Assembly Procedure</option>
                    <option value="MANPOWER">Manpower / Training</option>
                    <option value="MEASUREMENT">Measurement / Calibration</option>
                    <option value="ENVIRONMENT">Environment / Cleanroom</option>
                  </select>
                </div>
              )}
              {hypothesisForm.method === 'FIVE_WHYS' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Why Step Level (1 to 5)</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={hypothesisForm.stepLevel}
                    onChange={(e) => setHypothesisForm({ ...hypothesisForm, stepLevel: parseInt(e.target.value, 10) })}
                    className="w-full p-2 border rounded"
                  />
                </div>
              )}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Hypothesis Statement *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Why did the seal fail? Sealer thermocouple had intermittent cold spot..."
                  value={hypothesisForm.statement}
                  onChange={(e) => setHypothesisForm({ ...hypothesisForm, statement: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowHypothesisModal(false)}
                  className="px-3 py-1.5 rounded border text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-brand-600 text-white font-bold"
                >
                  Save Hypothesis
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

