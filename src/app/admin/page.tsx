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

export default function AdminPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  const [emailInput, setEmailInput] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function refreshAuth() {
    const { data } = await supabase.auth.getUser();
    const email = data.user?.email ?? null;
    setUserEmail(email);

    if (!data.user) {
      setIsAdmin(false);
      return;
    }

    // Check role from user_roles table
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .maybeSingle();

    setIsAdmin(roleRow?.role === "admin");
  }

  async function loadGroups() {
    setLoadingGroups(true);
    setMsg(null);

    const { data, error } = await supabase
      .from("groups")
      .select("id,name,weekly_amount,weeks_total,paid_weeks,updated_at")
      .order("updated_at", { ascending: false });

    if (error) setMsg(`Load error: ${error.message}`);
    setGroups((data as GroupRow[]) ?? []);
    setLoadingGroups(false);
  }

  useEffect(() => {
    refreshAuth();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      refreshAuth();
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isAdmin) loadGroups();
  }, [isAdmin]);

  const canEdit = useMemo(() => Boolean(userEmail && isAdmin), [userEmail, isAdmin]);

  async function sendMagicLink() {
    setSending(true);
    setMsg(null);

    const { error } = await supabase.auth.signInWithOtp({
      email: emailInput,
      options: { emailRedirectTo: typeof window !== "undefined" ? window.location.origin + "/admin" : undefined },
    });

    if (error) setMsg(error.message);
    else setMsg("✅ Sent! Check your email for the login link.");
    setSending(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setGroups([]);
    setMsg(null);
  }

  async function savePaidWeeks(id: string, paidWeeks: number) {
    setSavingId(id);
    setMsg(null);

    const { error } = await supabase
      .from("groups")
      .update({ paid_weeks: paidWeeks })
      .eq("id", id);

    if (error) {
      setMsg(`Save failed: ${error.message}`);
    } else {
      setMsg("✅ Saved!");
      await loadGroups();
    }

    setSavingId(null);
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Admin Panel</h1>
          <Link href="/" className="rounded-xl border bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">
            Back to Viewer
          </Link>
        </div>

        <div className="mt-6 rounded-3xl border bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-slate-700">
              <div>
                <b>Signed in as:</b> {userEmail ?? "Not signed in"}
              </div>
              <div>
                <b>Role:</b> {userEmail ? (isAdmin ? "admin ✅" : "viewer ❌") : "-"}
              </div>
            </div>

            {userEmail ? (
              <button
                onClick={signOut}
                className="rounded-xl border bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Sign out
              </button>
            ) : null}
          </div>

          {!userEmail && (
            <div className="mt-5 grid gap-3 sm:flex sm:items-center">
              <input
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="Enter admin email (magic link)"
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
              />
              <button
                onClick={sendMagicLink}
                disabled={sending || !emailInput}
                className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {sending ? "Sending..." : "Send Login Link"}
              </button>
            </div>
          )}

          {msg && (
            <div className="mt-4 rounded-xl border bg-slate-50 p-3 text-sm text-slate-800">
              {msg}
            </div>
          )}
        </div>

        <div className="mt-8 rounded-3xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Groups</h2>
          <p className="mt-1 text-sm text-slate-600">
            Only admins can update <b>paid_weeks</b>. (RLS will block non-admin writes.)
          </p>

          {!canEdit && userEmail && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              You are signed in but NOT an admin. Editing is disabled.
            </div>
          )}

          <div className="mt-5">
            {loadingGroups && <div className="text-slate-600">Loading...</div>}

            {!loadingGroups && groups.length === 0 && (
              <div className="text-slate-600">No groups found.</div>
            )}

            <div className="mt-4 space-y-4">
              {groups.map((g) => (
                <div key={g.id} className="rounded-2xl border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold">{g.name}</div>
                      <div className="text-sm text-slate-600">
                        weekly_amount: ${g.weekly_amount} • weeks_total: {g.weeks_total}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-sm text-slate-700">paid_weeks</label>
                      <input
                        type="number"
                        min={0}
                        max={g.weeks_total}
                        defaultValue={g.paid_weeks}
                        disabled={!canEdit || savingId === g.id}
                        className="w-24 rounded-xl border px-3 py-2 text-sm disabled:opacity-50"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const v = Number((e.target as HTMLInputElement).value);
                            savePaidWeeks(g.id, v);
                          }
                        }}
                      />
                      <button
                        disabled={!canEdit || savingId === g.id}
                        onClick={(e) => {
                          const input = (e.currentTarget.parentElement?.querySelector(
                            'input[type="number"]'
                          ) as HTMLInputElement) || null;
                          const v = Number(input?.value ?? g.paid_weeks);
                          savePaidWeeks(g.id, v);
                        }}
                        className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        {savingId === g.id ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {canEdit && (
              <button
                onClick={loadGroups}
                className="mt-6 rounded-xl border bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Refresh
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
