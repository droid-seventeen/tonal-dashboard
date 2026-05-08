"use client";

import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Dumbbell,
  Medal,
  Trophy,
  Users,
  Zap
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatDuration, formatNumber, rankMembersByAllTimeVolume } from "@/lib/metrics";
import type { TonalDashboard } from "@/lib/tonal";

type ApiPayload = {
  configured?: boolean;
  message?: string;
  members?: TonalDashboard[];
  error?: string;
};

type View = "leaderboard" | "detail";
const AUTO_REFRESH_INTERVAL_MS = 15 * 60 * 1000;

export default function DashboardApp() {
  const [payload, setPayload] = useState<ApiPayload | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<View>("leaderboard");
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/dashboard");
      const next = (await response.json().catch(() => ({ error: `Dashboard request failed (${response.status}).` }))) as ApiPayload;
      setPayload(response.ok ? next : { error: next.error ?? `Dashboard request failed (${response.status}).` });
    } catch (error) {
      setPayload({ error: (error as Error).message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), AUTO_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    function syncFromHash() {
      const memberId = decodeURIComponent(window.location.hash.replace(/^#member-/, ""));
      if (memberId && window.location.hash.startsWith("#member-")) {
        setSelected(memberId);
        setView("detail");
      } else {
        setView("leaderboard");
      }
    }

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  const leaderboard = useMemo(() => rankMembersByAllTimeVolume(payload?.members ?? []), [payload?.members]);
  const selectedMember = useMemo(
    () => leaderboard.find((candidate) => candidate.member.id === selected) ?? leaderboard[0],
    [leaderboard, selected]
  );

  function navigateToLeaderboard() {
    setView("leaderboard");
    setSelected(null);
    if (window.location.hash) window.history.pushState(null, "", window.location.pathname);
  }

  function openDetail(memberId: string) {
    setSelected(memberId);
    setView("detail");
    window.history.pushState(null, "", `#member-${encodeURIComponent(memberId)}`);
  }

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <section className="dashboard-frame">
        <header className="topbar">
          <a className="brand-lockup" href="#" onClick={(event) => { event.preventDefault(); navigateToLeaderboard(); }}>
            <span className="brand-mark"><Trophy size={18} /></span>
            <span>
              <span className="brand-title">Tonal League</span>
              <span className="brand-subtitle">Family volume board</span>
            </span>
          </a>
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
            <p>{loading ? "Updating live Tonal data…" : "Auto-updates from Tonal every fifteen minutes."}</p>
          </div>
          <span className="live-pill"><span /> Auto live</span>
        </div>

        <div className="leader-list">
          {leaderboard.map((member) => (
            <a className="leader-row" href={`#member-${encodeURIComponent(member.member.id)}`} key={member.member.id} onClick={() => onOpenMember(member.member.id)}>
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
            </a>
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
      <a className="back-button" href="#" onClick={(event) => { event.preventDefault(); onBack(); }}><ArrowLeft size={16} /> Back to leaderboard</a>
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
          {recentActivities.length ? (
            <div className="workout-row workout-header">
              <span>Date</span>
              <span>Workout</span>
              <span>Type</span>
              <span>Duration</span>
              <span>Volume</span>
            </div>
          ) : null}
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
