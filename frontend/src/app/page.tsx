"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, DashboardStats } from "@/lib/api";
import { RequireAuth } from "@/components/RequireAuth";
import {
  Users,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  PenLine,
  BrainCircuit,
  BarChart3,
  ArrowRight,
} from "lucide-react";

export default function Home() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    api.getStats().then(setStats).catch(() => {});
  }, []);

  const cards = stats
    ? [
        {
          label: "Total Leads",
          value: stats.total_leads,
          icon: Users,
          accent: "border-l-zinc-400",
        },
        {
          label: "Applications",
          value: stats.total_applications,
          icon: FileText,
          accent: "border-l-zinc-500",
        },
        {
          label: "Pending Assessment",
          value: stats.pending_assessment,
          icon: Clock,
          accent: "border-l-zinc-400",
        },
        {
          label: "Approved",
          value: stats.approved,
          icon: CheckCircle2,
          accent: "border-l-zinc-600",
        },
        {
          label: "Rejected",
          value: stats.rejected,
          icon: XCircle,
          accent: "border-l-zinc-400",
        },
        {
          label: "Low Risk",
          value: stats.low_risk,
          icon: ShieldCheck,
          accent: "border-l-zinc-600",
        },
        {
          label: "High Risk",
          value: stats.high_risk,
          icon: ShieldAlert,
          accent: "border-l-zinc-400",
        },
      ]
    : [];

  return (
    <RequireAuth>
      <div className="space-y-8">
        {/* Hero */}
        <div className="rounded-2xl bg-zinc-900 p-8 text-white">
          <h1 className="text-3xl font-black tracking-tight">Dashboard</h1>
          <p className="mt-2 text-sm text-zinc-400 max-w-xl leading-relaxed">
            AI-powered loan origination, risk assessment, and application
            management system for NBFCs. Capture leads, process applications,
            and get automated risk scoring.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/applications/new"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-zinc-900 shadow-sm transition-colors hover:bg-zinc-100"
            >
              <PenLine className="h-4 w-4" />
              New Application
            </Link>
            <Link
              href="/leads"
              className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
            >
              <Users className="h-4 w-4" />
              View Leads
            </Link>
            <Link
              href="/applications"
              className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
            >
              <BarChart3 className="h-4 w-4" />
              Admin Dashboard
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className={`rounded-xl border border-zinc-200 border-l-4 ${card.accent} bg-white p-5 shadow-sm transition-all hover:shadow-md`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                        {card.label}
                      </div>
                      <div className="mt-2 text-3xl font-black text-zinc-900">
                        {card.value}
                      </div>
                    </div>
                    <Icon className="h-6 w-6 text-zinc-300" strokeWidth={1.5} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Link
            href="/leads/new"
            className="group rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-zinc-400"
          >
            <PenLine className="h-6 w-6 text-zinc-400 group-hover:text-zinc-900 transition-colors" strokeWidth={1.5} />
            <div className="mt-3 font-bold text-zinc-900 group-hover:text-zinc-900 transition-colors">
              Create Lead
            </div>
            <div className="mt-1 text-xs text-zinc-500 leading-relaxed">
              Capture a new customer lead into the system
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs font-medium text-zinc-400 group-hover:text-zinc-600 transition-colors">
              Get started <ArrowRight className="h-3 w-3" />
            </div>
          </Link>
          <Link
            href="/applications/new"
            className="group rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-zinc-400"
          >
            <BrainCircuit className="h-6 w-6 text-zinc-400 group-hover:text-zinc-900 transition-colors" strokeWidth={1.5} />
            <div className="mt-3 font-bold text-zinc-900 group-hover:text-zinc-900 transition-colors">
              New Application
            </div>
            <div className="mt-1 text-xs text-zinc-500 leading-relaxed">
              Multi-step form with AI risk scoring
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs font-medium text-zinc-400 group-hover:text-zinc-600 transition-colors">
              Get started <ArrowRight className="h-3 w-3" />
            </div>
          </Link>
          <Link
            href="/applications"
            className="group rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-zinc-400"
          >
            <BarChart3 className="h-6 w-6 text-zinc-400 group-hover:text-zinc-900 transition-colors" strokeWidth={1.5} />
            <div className="mt-3 font-bold text-zinc-900 group-hover:text-zinc-900 transition-colors">
              Admin Dashboard
            </div>
            <div className="mt-1 text-xs text-zinc-500 leading-relaxed">
              Pipeline view with risk scores and statuses
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs font-medium text-zinc-400 group-hover:text-zinc-600 transition-colors">
              Get started <ArrowRight className="h-3 w-3" />
            </div>
          </Link>
        </div>
      </div>
    </RequireAuth>
  );
}
