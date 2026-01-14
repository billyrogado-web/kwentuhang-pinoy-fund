"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type GroupRow = {
  id: string;
  name: string;
  weekly_amount: number;
  weeks_total: number;
  paid_weeks: number;
  updated_at: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function HomePage() {
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  async function loadGroups() {
    setLoading(true);
    setMsg(null);

    const { data, error } = await supabase
      .from("groups")
      .select("id,name,weekly_amount,weeks_total,paid_weeks,updated_at")
      .order("updated_at", { ascending: false });

    if (error) {
      setMsg(`Load error: ${error.message}`);
      setGroups([]);
    } else {
      setGroups((data as GroupRow[]) ?? []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadGroups();
  }, []);

  const stats = useMemo(() => {
    const members = groups.length;
    const monthWeeks =
      members > 0 ? Math.max(...groups.map((g) => Number(g.weeks_total || 0))) : 4;

    const totalCollected = groups.reduce((sum, g) => {
      const paidWeeks = Number(g.paid_weeks || 0);
      const weekly = Number(g.weekly_amount || 0);
      return sum + paidWeeks * weekly;
    }, 0);

    const fullMonthPaid = groups.filter(
      (g) => Number(g.paid_weeks || 0) >= Number(g.weeks_total || 0)
    ).length;

    const targetPerMember = groups[0]?.weeks_total
      ? Number(groups[0].weeks_total) * Number(groups[0].weekly_amount || 0)
      : 40;

    return { members, monthWeeks, totalCollected, fullMonthPaid, targetPerMember };
  }, [groups]);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-3xl border bg-white p-7 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">Kwentuhang Pinoy Fund</h1>
              <p className="mt-1 text-sm text-slate-600">
                Weekly hulugan • ${groups[0]?.weekly_amount ?? 10}/week • Full month = $
                {stats.targetPerMember}
              </p>
            </div>

            <Link
              href="/admin"
              className="rounded-xl border bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Admin
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-slate-600">Total collected</p>
              <p className="text-3xl font-semibold">${stats.totalCollected}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-600">Full month paid</p>
              <p className="text-lg font-semibold">
                {stats.fullMonthPaid}/{stats.members}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-4 text-sm text-slate-700">
            <span>
              <b>Month:</b> {stats.monthWeeks} weeks
            </span>
            <span>
              <b>Members:</b> {stats.members}
            </span>
            <span>
              <b>Target:</b> ${stats.targetPerMember}/member
            </span>
          </div>

          {msg && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {msg}
            </div>
          )}
        </div>

        <div className="mt-8 space-y-5">
          {loading && (
            <div className="rounded-3xl border bg-white p-6 text-slate-600">
              Loading...
            </div>
          )}

          {!loading && groups.length === 0 && (
            <div className="rounded-3xl border bg-white p-6 text-slate-600">
              No groups found.
            </div>
          )}

          {!loading &&
            groups.map((g) => {
              const paidWeeks = Number(g.paid_weeks || 0);
              const totalWeeks = Number(g.weeks_total || 0);
              const weekly = Number(g.weekly_amount || 0);
              const paidAmount = paidWeeks * weekly;
              const pct = totalWeeks > 0 ? clamp((paidWeeks / totalWeeks) * 100, 0, 100) : 0;

              return (
                <div
                  key={g.id}
                  className="rounded-3xl border bg-white p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-lg font-semibold">{g.name}</h2>
                      <p className="text-sm text-slate-600">Paid: ${paidAmount}</p>
                    </div>
                    <div className="text-right text-sm text-slate-600">
                      <div className="font-medium text-slate-800">
                        {paidWeeks}/{totalWeeks} weeks
                      </div>
                      <div>{Math.round(pct)}%</div>
                    </div>
                  </div>

                  <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-slate-900"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </main>
  );
}
