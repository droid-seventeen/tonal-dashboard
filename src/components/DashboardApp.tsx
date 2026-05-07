"use client";

import { Dumbbell, Lock, LogOut, RefreshCw, ShieldCheck, Users } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { formatDuration, formatNumber } from "@/lib/metrics";
import type { TonalDashboard } from "@/lib/tonal";

type ApiPayload = {
  configured?: boolean;
  message?: string;
  members?: TonalDashboard[];
  error?: string;
};

export default function DashboardApp({ initialAuthed, passwordEnabled }: { initialAuthed: boolean; passwordEnabled: boolean }) {
  const [authed, setAuthed] = useState(initialAuthed);
  const [payload, setPayload] = useState<ApiPayload | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const response = await fetch("/api/dashboard", { cache: "no-store" });
    if (response.status === 401) {
      setAuthed(false);
      setLoading(false);
      return;
    }
    const next = (await response.json()) as ApiPayload;
    setPayload(next);
    setSelected((current) => current ?? next.members?.[0]?.member.id ?? null);
    setLoading(false);
  }

  useEffect(() => {
    if (authed) void load();
  }, [authed]);

  const member = useMemo(
    () => payload?.members?.find((candidate) => candidate.member.id === selected) ?? payload?.members?.[0],
    [payload, selected]
  );

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: form.get("password") })
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setLoginError(body.error ?? "Login failed.");
      return;
    }
    setAuthed(true);
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    setAuthed(false);
    setPayload(null);
  }

  if (!authed) {
    return <LoginScreen passwordEnabled={passwordEnabled} loginError={loginError} onSubmit={login} />;
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#334155,transparent_40%),#050816] text-slate-100">
      <section className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-8 md:px-8">
        <header className="flex flex-col justify-between gap-4 rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur md:flex-row md:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-200">
              <Dumbbell size={14} /> Tonal family ops
            </div>
            <h1 className="text-3xl font-black tracking-tight md:text-5xl">Custom Tonal dashboard</h1>
            <p className="mt-3 max-w-2xl text-slate-300">
              Shared private view of strength score, muscle readiness, weekly volume, and recent sessions for every configured family member.
            </p>
          </div>
          <div className="flex gap-3">
            <button className="button-secondary" onClick={load} disabled={loading}>
              <RefreshCw className={loading ? "animate-spin" : ""} size={16} /> Refresh
            </button>
            <button className="button-secondary" onClick={logout}>
              <LogOut size={16} /> Logout
            </button>
          </div>
        </header>

        {payload?.error ? <Notice tone="error">{payload.error}</Notice> : null}
        {payload?.configured === false ? <Notice>{payload.message}</Notice> : null}

        <div className="flex flex-wrap gap-3">
          {payload?.members?.map((candidate) => (
            <button
              className={`member-tab ${candidate.member.id === member?.member.id ? "member-tab-active" : ""}`}
              key={candidate.member.id}
              onClick={() => setSelected(candidate.member.id)}
            >
              <Users size={16} /> {candidate.member.name}
            </button>
          ))}
        </div>

        {loading && !member ? <Notice>Loading Tonal data…</Notice> : null}
        {member ? <MemberDashboard data={member} /> : null}
      </section>
    </main>
  );
}

function LoginScreen({ passwordEnabled, loginError, onSubmit }: { passwordEnabled: boolean; loginError: string | null; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-5 text-slate-100">
      <form className="w-full max-w-md rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur" onSubmit={onSubmit}>
        <div className="mb-6 inline-flex rounded-2xl bg-cyan-300/10 p-4 text-cyan-200"><Lock /></div>
        <h1 className="text-3xl font-black">Tonal Family Dashboard</h1>
        <p className="mt-2 text-slate-300">Private family view. Use the shared dashboard password.</p>
        <input
          className="mt-6 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none ring-cyan-300/40 focus:ring-4"
          name="password"
          placeholder={passwordEnabled ? "Dashboard password" : "No password configured locally"}
          type="password"
        />
        {loginError ? <p className="mt-3 text-sm text-red-300">{loginError}</p> : null}
        <button className="button-primary mt-5 w-full" type="submit"><ShieldCheck size={16} /> Enter dashboard</button>
      </form>
    </main>
  );
}

function MemberDashboard({ data }: { data: TonalDashboard }) {
  const maxWeekVolume = Math.max(1, ...data.weeklyVolume.map((week) => week.volume));
  const recentActivities = data.activities.slice(0, 8);
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <section className="space-y-6">
        {data.errors.length ? <Notice tone="error">{data.errors.join(" • ")}</Notice> : null}
        <div className="grid gap-4 md:grid-cols-4">
          <Stat label="Overall" value={data.strength.overall} />
          <Stat label="Upper" value={data.strength.upper} />
          <Stat label="Core" value={data.strength.core} />
          <Stat label="Lower" value={data.strength.lower} />
        </div>
        <Card title="Weekly volume">
          <div className="space-y-3">
            {data.weeklyVolume.slice(-8).map((week) => (
              <div className="grid grid-cols-[80px_1fr_90px] items-center gap-3" key={week.week}>
                <span className="text-sm text-slate-400">{week.week}</span>
                <div className="h-3 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-cyan-300" style={{ width: `${Math.max(4, (week.volume / maxWeekVolume) * 100)}%` }} />
                </div>
                <span className="text-right text-sm text-slate-300">{formatNumber(week.volume)} lb</span>
              </div>
            ))}
            {!data.weeklyVolume.length ? <Empty text="No recent volume data yet." /> : null}
          </div>
        </Card>
        <Card title="Recent workouts">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-slate-500">
                <tr><th className="py-2">Date</th><th>Workout</th><th>Target</th><th>Duration</th><th className="text-right">Volume</th></tr>
              </thead>
              <tbody>
                {recentActivities.map((activity) => (
                  <tr className="border-t border-white/10" key={activity.activityId ?? activity.activityTime}>
                    <td className="py-3 text-slate-400">{activity.activityTime ? new Date(activity.activityTime).toLocaleDateString() : "—"}</td>
                    <td className="font-medium">{activity.workoutPreview?.workoutTitle ?? activity.activityType ?? "Workout"}</td>
                    <td className="text-slate-300">{activity.workoutPreview?.targetArea ?? "—"}</td>
                    <td className="text-slate-300">{formatDuration(activity.workoutPreview?.totalDuration)}</td>
                    <td className="text-right text-slate-300">{formatNumber(activity.workoutPreview?.totalVolume)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!recentActivities.length ? <Empty text="No recent workouts returned." /> : null}
          </div>
        </Card>
      </section>
      <aside className="space-y-6">
        <Card title="Top recovered muscles">
          <div className="grid gap-3">
            {data.topReady.map(([muscle, score]) => <ReadinessRow key={muscle} muscle={muscle} score={score} />)}
            {!data.topReady.length ? <Empty text="No readiness data returned." /> : null}
          </div>
        </Card>
        <Card title="Readiness matrix">
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(data.readiness).sort().map(([muscle, score]) => (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3" key={muscle}>
                <div className="text-xs text-slate-400">{muscle}</div>
                <div className="text-xl font-black">{Math.round(score)}%</div>
              </div>
            ))}
          </div>
        </Card>
      </aside>
    </div>
  );
}

function Stat({ label, value }: { label: string; value?: number }) {
  return <div className="card"><div className="text-sm text-slate-400">{label}</div><div className="mt-2 text-4xl font-black">{value ?? "—"}</div></div>;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="card"><h2 className="mb-4 text-lg font-bold">{title}</h2>{children}</section>;
}

function ReadinessRow({ muscle, score }: { muscle: string; score: number }) {
  return <div><div className="mb-1 flex justify-between text-sm"><span>{muscle}</span><span>{Math.round(score)}%</span></div><div className="h-2 rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-300" style={{ width: `${score}%` }} /></div></div>;
}

function Notice({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "error" }) {
  return <div className={`rounded-2xl border p-4 ${tone === "error" ? "border-red-300/30 bg-red-400/10 text-red-100" : "border-cyan-300/30 bg-cyan-300/10 text-cyan-100"}`}>{children}</div>;
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-400">{text}</div>;
}
