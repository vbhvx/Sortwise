'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShieldAlert,
  ClipboardList,
  PlusCircle,
  SearchCode,
  FileCheck2,
  History,
  Settings,
  ChevronDown,
  UserCheck,
  Building2,
  AlertTriangle,
  Menu,
  X,
} from 'lucide-react';

export interface Persona {
  userId: string;
  email: string;
  fullName: string;
  title?: string;
  role: string;
}

export function Navbar() {
  const pathname = usePathname();
  const [session, setSession] = useState<any>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchSession();
  }, []);

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/v1/auth/session');
      const data = await res.json();
      if (data.session) setSession(data.session);
      if (data.availablePersonas) setPersonas(data.availablePersonas);
    } catch (err) {
      console.error('Failed to load session:', err);
    }
  };

  const switchPersona = async (email: string) => {
    try {
      const res = await fetch('/api/v1/auth/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.session) {
        setSession(data.session);
        setShowPersonaMenu(false);
        window.location.reload();
      }
    } catch (err) {
      console.error('Failed to switch persona:', err);
    }
  };

  const navLinks = [
    { href: '/', label: 'Dashboard', icon: ClipboardList },
    { href: '/complaints', label: 'Complaints', icon: ShieldAlert },
    { href: '/complaints/new', label: 'New Intake', icon: PlusCircle },
    { href: '/investigations', label: 'Investigations', icon: SearchCode },
    { href: '/capas', label: 'CAPA', icon: FileCheck2 },
    { href: '/audit', label: 'Audit Trail', icon: History },
    { href: '/settings', label: 'Regulatory & Settings', icon: Settings },
  ];

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMINISTRATOR':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'QUALITY_APPROVER':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'INVESTIGATOR':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'COMPLAINT_REVIEWER':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'READONLY_AUDITOR':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo & Platform Title */}
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-brand-700 to-brand-500 flex items-center justify-center text-white font-bold shadow-md">
                SW
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
                  Sortwise
                  <span className="text-xs uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-200">
                    Quality Intelligence
                  </span>
                </span>
                <span className="block text-[11px] text-slate-500 -mt-0.5">
                  FDA QMSR 21 CFR 820 & ISO 13485 Platform
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/'
                  ? pathname === '/'
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs lg:text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-100 text-brand-700 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Persona Switcher */}
          <div className="flex items-center space-x-3">
            <div className="relative">
              <button
                onClick={() => setShowPersonaMenu(!showPersonaMenu)}
                className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50 text-left transition-all"
                title="Switch active user persona to test RBAC roles"
              >
                <div className="hidden sm:block">
                  <div className="text-xs font-semibold text-slate-800 leading-tight">
                    {session?.fullName || 'Sarah Chen'}
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-1">
                    <span
                      className={`inline-block px-1 rounded text-[9px] font-semibold border ${getRoleBadgeColor(
                        session?.role || 'COMPLAINT_REVIEWER'
                      )}`}
                    >
                      {session?.role || 'COMPLAINT_REVIEWER'}
                    </span>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {/* Persona Dropdown */}
              {showPersonaMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-1">
                  <div className="px-3 py-1.5 border-b border-slate-100">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Switch Role Persona (RBAC Simulation)
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Apex Biomedical Quality Systems
                    </p>
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
                    {personas.map((p) => (
                      <button
                        key={p.userId}
                        onClick={() => switchPersona(p.email)}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                          session?.email === p.email ? 'bg-brand-50/60 font-semibold' : ''
                        }`}
                      >
                        <div>
                          <div className="text-slate-900 font-medium">{p.fullName}</div>
                          <div className="text-[10px] text-slate-500">{p.title || p.email}</div>
                        </div>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getRoleBadgeColor(
                            p.role
                          )}`}
                        >
                          {p.role}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}

