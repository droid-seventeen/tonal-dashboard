"use client";

import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Dumbbell,
  Lock,
  LogOut,
  Medal,
  RefreshCw,
  ShieldCheck,
  Trophy,
  Users,
  Zap
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { formatDuration, formatNumber, rankMembersByAllTimeVolume } from "@/lib/metrics";
import type { TonalDashboard } from "@/lib/tonal";

type ApiPayload = {
  configured?: boolean;
  message?: string;
  members?: TonalDashboard[];
  error?: string;
};

type View = "leaderboard" | "detail";

export default function DashboardApp({ initialAuthed, passwordEnabled }: { initialAuthed: boolean; passwordEnabled: boolean }) {
  const [authed, setAuthed] = useState(initialAuthed);
  const [payload, setPayload] = useState<ApiPayload | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<View>("leaderboard");
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
    setLoading(false);
  }

  useEffect(() => {
    if (authed) void load();
  }, [authed]);

  const leaderboard = useMemo(() => rankMembersByAllTimeVolume(payload?.members ?? []), [payload?.members]);
  const selectedMember = useMemo(
    () => leaderboard.find((candidate) => candidate.member.id === selected) ?? leaderboard[0],
    [leaderboard, selected]
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
    setSelected(null);
    setView("leaderboard");
  }

  function openDetail(memberId: string) {
    setSelected(memberId);
    setView("detail");
  }

  if (!authed) {
    return <LoginScreen passwordEnabled={passwordEnabled} loginError={loginError} onSubmit={login} />;
  }

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <section className="dashboard-frame">
        <header className="topbar">
          <button className="brand-lockup" onClick={() => setView("leaderboard")} type="button">
            <span className="brand-mark"><Trophy size={18} /></span>
            <span>
              <span className="brand-title">Tonal League</span>
              <span className="brand-subtitle">Family volume board</span>
            </span>
          </button>
          <div className="topbar-actions">
            <button className="ghost-button" onClick={load} disabled={loading} type="button">
              <RefreshCw className={loading ? "spin" : ""} size={15} /> Refresh
            </button>
            <button className="ghost-button" onClick={logout} type="button">
              <LogOut size={15} /> Logout
            </button>
          </div>
        </header>

        {payload?.error ? <Notice tone="error">{payload.error}</Notice> : null}
        {payload?.configured === false ? <Notice>{payload.message}</Notice> : null}
        {loading && !payload ? <LeaderboardSkeleton /> : null}

        {payload && view === "leaderboard" ? (
          <LeaderboardView leaderboard={leaderboard} loading={loading} onOpenMember={openDetail} />
        ) : null}

        {payload && view === "detail" && selectedMember ? (
          <MemberDashboard data={selectedMember} onBack={() => setView("leaderboard")} />
        ) : null}
      </section>
    </main>
  );
}

function LeaderboardView({
  leaderboard,
  loading,
  onOpenMember
}: {
  leaderboard: ReturnType<typeof rankMembersByAllTimeVolume<TonalDashboard>>;
  loading: boolean;
  onOpenMember: (memberId: string) => void;
}) {
  const champion = leaderboard[0];
  const totalFamilyVolume = leaderboard.reduce((sum, member) => sum + member.allTime.totalVolume, 0);
  const totalFamilyWorkouts = leaderboard.reduce((sum, member) => sum + member.allTime.totalWorkouts, 0);

  return (
    <section className="leaderboard-page">
      <div className="leaderboard-hero">
        <div className="hero-copy">
          <div className="eyebrow"><Medal size={14} /> All-time leaderboard</div>
          <h1>Who has moved the most iron?</h1>
          <p>
            Lifetime Tonal volume, ranked across everyone in the family. Click a competitor to open their training dashboard.
          </p>
        </div>
        <div className="hero-stat-card">
          <span className="stat-overline">Current leader</span>
          <strong>{champion?.member.name ?? "Waiting for data"}</strong>
          <span>{champion ? `${formatNumber(champion.allTime.totalVolume)} lb lifted` : "Add Tonal members to begin."}</span>
        </div>
      </div>

      <div className="league-strip">
        <LeagueStat label="Family volume" value={formatNumber(totalFamilyVolume)} suffix="lb" />
        <LeagueStat label="Tracked workouts" value={formatNumber(totalFamilyWorkouts)} />
        <LeagueStat label="Competitors" value={formatNumber(leaderboard.length)} />
      </div>

      <div className="leaderboard-card">
        <div className="leaderboard-heading">
          <div>
            <h2>Volume standings</h2>
            <p>{loading ? "Refreshing live Tonal data…" : "Sorted by all-time Tonal volume."}</p>
          </div>
          <span className="live-pill"><span /> Live API</span>
        </div>

        <div className="leader-list">
          {leaderboard.map((member) => (
            <button className="leader-row" key={member.member.id} onClick={() => onOpenMember(member.member.id)} type="button">
              <span className="leader-rank">#{member.rank}</span>
              <span className="leader-avatar">{initials(member.member.name)}</span>
              <span className="leader-main">
                <strong>{member.member.name}</strong>
                <span>{member.allTime.totalWorkouts ? `${formatNumber(member.allTime.totalWorkouts)} workouts` : "No workouts loaded yet"}</span>
              </span>
              <span className="leader-volume">
                <strong>{formatNumber(member.allTime.totalVolume)}</strong>
                <span>lb all-time</span>
              </span>
              <ChevronRight className="leader-chevron" size={18} />
            </button>
          ))}
          {!leaderboard.length ? <Empty text="No members configured yet. Add TONAL_MEMBERS_JSON entries to populate the league." /> : null}
        </div>
      </div>
    </section>
  );
}

function MemberDashboard({ data, onBack }: { data: TonalDashboard & { rank: number }; onBack: () => void }) {
  const maxWeekVolume = Math.max(1, ...data.weeklyVolume.map((week) => week.volume));
  const recentActivities = data.activities.slice(0, 8);
  return (
    <section className="detail-page">
      <button className="back-button" onClick={onBack} type="button"><ArrowLeft size={16} /> Back to leaderboard</button>
      {data.errors.length ? <Notice tone="error">{data.errors.join(" • ")}</Notice> : null}

      <div className="athlete-hero">
        <div>
          <div className="eyebrow"><Users size={14} /> Rank #{data.rank}</div>
          <h1>{data.member.name}</h1>
          <p>
            {data.allTime.firstWorkoutAt ? `Training tracked since ${formatDate(data.allTime.firstWorkoutAt)}.` : "Waiting for workout history."}
          </p>
        </div>
        <div className="athlete-volume-card">
          <span>All-time volume</span>
          <strong>{formatNumber(data.allTime.totalVolume)}</strong>
          <span>pounds lifted</span>
        </div>
      </div>

      <div className="metric-grid">
        <MetricCard icon={<Trophy size={17} />} label="All-time volume" value={formatNumber(data.allTime.totalVolume)} suffix="lb" />
        <MetricCard icon={<Dumbbell size={17} />} label="Workouts" value={formatNumber(data.allTime.totalWorkouts)} />
        <MetricCard icon={<Zap size={17} />} label="Total reps" value={formatNumber(data.allTime.totalReps)} />
        <MetricCard icon={<CalendarDays size={17} />} label="Time trained" value={formatDuration(data.allTime.totalDuration)} />
      </div>

      <div className="detail-grid">
        <section className="panel strength-panel">
          <div className="panel-heading"><h2>Strength score</h2><span>Current</span></div>
          <div className="strength-grid">
            <StrengthDial label="Overall" value={data.strength.overall} featured />
            <StrengthDial label="Upper" value={data.strength.upper} />
            <StrengthDial label="Core" value={data.strength.core} />
            <StrengthDial label="Lower" value={data.strength.lower} />
          </div>
        </section>

        <section className="panel readiness-panel">
          <div className="panel-heading"><h2>Most recovered</h2><span>Readiness</span></div>
          <div className="readiness-list">
            {data.topReady.map(([muscle, score]) => <ReadinessRow key={muscle} muscle={muscle} score={score} />)}
            {!data.topReady.length ? <Empty text="No readiness data returned." /> : null}
          </div>
        </section>

        <section className="panel weekly-panel">
          <div className="panel-heading"><h2>Weekly volume</h2><span>Recent</span></div>
          <div className="weekly-bars">
            {data.weeklyVolume.slice(-8).map((week) => (
              <div className="week-row" key={week.week}>
                <span>{week.week}</span>
                <div className="bar-track"><div style={{ width: `${Math.max(5, (week.volume / maxWeekVolume) * 100)}%` }} /></div>
                <strong>{formatNumber(week.volume)}</strong>
              </div>
            ))}
            {!data.weeklyVolume.length ? <Empty text="No recent volume data yet." /> : null}
          </div>
        </section>

        <section className="panel readiness-matrix-panel">
          <div className="panel-heading"><h2>Readiness matrix</h2><span>{Object.keys(data.readiness).length} muscles</span></div>
          <div className="readiness-matrix">
            {Object.entries(data.readiness).sort().map(([muscle, score]) => (
              <div className="muscle-tile" key={muscle}>
                <span>{muscle}</span>
                <strong>{Math.round(score)}%</strong>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="panel workouts-panel">
        <div className="panel-heading"><h2>Recent workouts</h2><span>Latest 8</span></div>
        <div className="workout-list">
          {recentActivities.map((activity) => (
            <div className="workout-row" key={activity.activityId ?? activity.activityTime}>
              <span className="workout-date">{activity.activityTime ? formatDate(activity.activityTime) : "—"}</span>
              <span className="workout-title">{activity.workoutPreview?.workoutTitle ?? activity.activityType ?? "Workout"}</span>
              <span>{activity.workoutPreview?.targetArea ?? "—"}</span>
              <span>{formatDuration(activity.workoutPreview?.totalDuration)}</span>
              <strong>{formatNumber(activity.workoutPreview?.totalVolume)} lb</strong>
            </div>
          ))}
          {!recentActivities.length ? <Empty text="No recent workouts returned." /> : null}
        </div>
      </section>
    </section>
  );
}

function LoginScreen({ passwordEnabled, loginError, onSubmit }: { passwordEnabled: boolean; loginError: string | null; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <main className="login-shell">
      <form className="login-card" onSubmit={onSubmit}>
        <div className="brand-mark login-mark"><Lock size={20} /></div>
        <div className="eyebrow">Private league</div>
        <h1>Tonal League</h1>
        <p>Enter the shared dashboard password to view family standings and training detail.</p>
        <input name="password" placeholder={passwordEnabled ? "Dashboard password" : "No password configured locally"} type="password" />
        {loginError ? <p className="form-error">{loginError}</p> : null}
        <button className="primary-button" type="submit"><ShieldCheck size={16} /> Enter leaderboard</button>
      </form>
    </main>
  );
}

function LeagueStat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return <div className="league-stat"><span>{label}</span><strong>{value}{suffix ? <em> {suffix}</em> : null}</strong></div>;
}

function MetricCard({ icon, label, value, suffix }: { icon: React.ReactNode; label: string; value: string; suffix?: string }) {
  return <div className="metric-card"><span className="metric-icon">{icon}</span><span>{label}</span><strong>{value}{suffix ? <em> {suffix}</em> : null}</strong></div>;
}

function StrengthDial({ label, value, featured = false }: { label: string; value?: number; featured?: boolean }) {
  return <div className={featured ? "strength-dial strength-dial-featured" : "strength-dial"}><span>{label}</span><strong>{value ?? "—"}</strong></div>;
}

function ReadinessRow({ muscle, score }: { muscle: string; score: number }) {
  return <div className="readiness-row"><div><span>{muscle}</span><strong>{Math.round(score)}%</strong></div><div className="bar-track"><div style={{ width: `${score}%` }} /></div></div>;
}

function Notice({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "error" }) {
  return <div className={tone === "error" ? "notice notice-error" : "notice"}>{children}</div>;
}

function Empty({ text }: { text: string }) {
  return <div className="empty-state">{text}</div>;
}

function LeaderboardSkeleton() {
  return <div className="leaderboard-card skeleton-card"><div /><div /><div /></div>;
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}
