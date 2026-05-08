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
type RecentWorkoutDetail = TonalDashboard["recentWorkoutDetails"][number];
type RecentMovement = RecentWorkoutDetail["movementSets"][number];
type RecentSet = NonNullable<RecentMovement["sets"]>[number];
type RaceStats = {
  volume: number;
  percent: number;
  percentLabel: string;
  remaining: number;
  complete: boolean;
};
const RACE_TARGET_VOLUME = 500_000;
const RACE_TARGET_LABEL = "500,000";

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
              <span className="brand-title">Race to 500K</span>
              <span className="brand-subtitle">Tonal Grand Prix</span>
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
          <MemberDashboard data={selectedMember} onBack={navigateToLeaderboard} />
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
  const pole = leaderboard[0];
  const totalFamilyVolume = leaderboard.reduce((sum, member) => sum + member.allTime.totalVolume, 0);
  const totalFamilyWorkouts = leaderboard.reduce((sum, member) => sum + member.allTime.totalWorkouts, 0);
  const poleRace = raceStats(pole?.allTime.totalVolume ?? 0);

  return (
    <section className="leaderboard-page race-page">
      <div className="leaderboard-hero race-hero">
        <div className="hero-copy race-hero-copy">
          <div className="eyebrow"><Medal size={14} /> Green flag is up</div>
          <h1>The race to 500K is live.</h1>
          <p>
            First to {RACE_TARGET_LABEL} lifetime pounds owns the family paddock. No boring rankings, just odometers.
          </p>
        </div>
        <div className="hero-stat-card race-control-card">
          <span className="stat-overline">Pole position</span>
          <strong>{pole?.member.name ?? "Waiting for racers"}</strong>
          {pole ? (
            <>
              <span>{formatNumber(pole.allTime.totalVolume)} / {RACE_TARGET_LABEL} lb • {poleRace.percentLabel} complete</span>
              <RaceProgressBar stats={poleRace} />
              <span className="race-remaining">{raceRemainingLabel(poleRace)}</span>
            </>
          ) : (
            <span>Add Tonal members to open the starting grid.</span>
          )}
        </div>
      </div>

      <div className="league-strip race-strip">
        <LeagueStat label="Race target" value={RACE_TARGET_LABEL} suffix="lb" />
        <LeagueStat label="Crew volume" value={formatNumber(totalFamilyVolume)} suffix="lb" />
        <LeagueStat label="Race logs" value={formatNumber(totalFamilyWorkouts)} />
      </div>

      <div className="leaderboard-card race-standings-card">
        <div className="leaderboard-heading">
          <div>
            <h2>Pit lane standings</h2>
            <p>{loading ? "Clocking fresh Tonal splits…" : "No boring rankings, just odometers. Refresh the page to pull the latest Tonal data."}</p>
          </div>
          <span className="live-pill"><span /> Manual timing</span>
        </div>

        <div className="leader-list race-list">
          {leaderboard.map((member) => {
            const stats = raceStats(member.allTime.totalVolume);
            return (
              <a className="leader-row race-row" href={`#member-${encodeURIComponent(member.member.id)}`} key={member.member.id} onClick={(event) => { event.preventDefault(); onOpenMember(member.member.id); }}>
                <span className="leader-rank">P{member.rank}</span>
                <span className="leader-avatar">{initials(member.member.name)}</span>
                <span className="leader-main">
                  <strong>{member.member.name}</strong>
                  <span>{stats.percentLabel} complete • {member.allTime.totalWorkouts ? `${formatNumber(member.allTime.totalWorkouts)} race logs` : "Awaiting first lap"}</span>
                </span>
                <span className="race-progress-cell">
                  <span>{raceRemainingLabel(stats)}</span>
                  <RaceProgressBar stats={stats} />
                </span>
                <span className="leader-volume">
                  <strong>{formatNumber(member.allTime.totalVolume)}</strong>
                  <span>lb logged</span>
                </span>
                <ChevronRight className="leader-chevron" size={18} />
              </a>
            );
          })}
          {!leaderboard.length ? <Empty text="No racers configured yet. Add TONAL_MEMBERS_JSON entries to open the grid." /> : null}
        </div>
      </div>
    </section>
  );
}

function MemberDashboard({ data, onBack }: { data: TonalDashboard & { rank: number }; onBack: () => void }) {
  const maxWeekVolume = Math.max(1, ...data.weeklyVolume.map((week) => week.volume));
  const recentActivities = data.activities.slice(0, 8);
  const recentWorkoutCards = recentActivities.slice(0, 5);
  const racerStats = raceStats(data.allTime.totalVolume);
  const detailsByActivity = useMemo(
    () => new Map((data.recentWorkoutDetails ?? []).map((detail) => [detail.activityId, detail])),
    [data.recentWorkoutDetails]
  );
  return (
    <section className="detail-page">
      <a className="back-button" href="#" onClick={(event) => { event.preventDefault(); onBack(); }}><ArrowLeft size={16} /> Back to race</a>
      {data.errors.length ? <Notice tone="error">{data.errors.join(" • ")}</Notice> : null}

      <div className="athlete-hero">
        <div>
          <div className="eyebrow"><Users size={14} /> Lane #{data.rank} / {RACE_TARGET_LABEL} chase</div>
          <h1>{data.member.name} in the chase</h1>
          <p>
            {data.allTime.firstWorkoutAt ? `Race started ${formatDate(data.allTime.firstWorkoutAt)}.` : "Waiting for a first lap."} {raceRemainingLabel(racerStats)}.
          </p>
        </div>
        <div className="athlete-volume-card race-control-card">
          <span>Race odometer</span>
          <strong>{formatNumber(data.allTime.totalVolume)}</strong>
          <span>{racerStats.percentLabel} complete • {RACE_TARGET_LABEL} lb finish</span>
          <RaceProgressBar stats={racerStats} />
          <span className="race-remaining">{raceRemainingLabel(racerStats)}</span>
        </div>
      </div>

      <div className="metric-grid">
        <MetricCard icon={<Trophy size={17} />} label="Race progress" value={`${racerStats.percentLabel} complete`} />
        <MetricCard icon={<Dumbbell size={17} />} label="To checkered flag" value={formatNumber(racerStats.remaining)} suffix="lb" />
        <MetricCard icon={<Zap size={17} />} label="Fuel burned" value={formatNumber(data.allTime.totalReps)} suffix="reps" />
        <MetricCard icon={<CalendarDays size={17} />} label="Track time" value={formatDuration(data.allTime.totalDuration)} />
      </div>

      <div className="detail-grid">
        <section className="panel strength-panel">
          <div className="panel-heading"><h2>Engine rating</h2><span>Current tune</span></div>
          <div className="strength-grid">
            <StrengthDial label="Overall" value={data.strength.overall} featured />
            <StrengthDial label="Upper" value={data.strength.upper} />
            <StrengthDial label="Core" value={data.strength.core} />
            <StrengthDial label="Lower" value={data.strength.lower} />
          </div>
        </section>

        <section className="panel readiness-panel">
          <div className="panel-heading"><h2>Pit crew recovery</h2><span>Ready muscles</span></div>
          <div className="readiness-list">
            {data.topReady.map(([muscle, score]) => <ReadinessRow key={muscle} muscle={muscle} score={score} />)}
            {!data.topReady.length ? <Empty text="No readiness data returned." /> : null}
          </div>
        </section>

        <section className="panel weekly-panel">
          <div className="panel-heading"><h2>Lap volume</h2><span>Recent splits</span></div>
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
          <div className="panel-heading"><h2>Muscle garage</h2><span>{Object.keys(data.readiness).length} muscles</span></div>
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
        <div className="panel-heading workout-dna-heading">
          <div>
            <h2>Pit telemetry</h2>
            <p>Workout DNA rebuilt as race telemetry: movement bars, power spikes, and next-lap weight nudges.</p>
          </div>
          <span>Latest {recentWorkoutCards.length || 0}</span>
        </div>
        <div className="workout-dna-grid">
          {recentWorkoutCards.map((activity) => (
            <WorkoutDnaCard
              activity={activity}
              detail={activity.activityId ? detailsByActivity.get(activity.activityId) : undefined}
              key={activity.activityId ?? activity.activityTime}
            />
          ))}
          {!recentWorkoutCards.length ? <Empty text="No recent workouts returned." /> : null}
        </div>
      </section>
    </section>
  );
}

function RaceProgressBar({ stats }: { stats: RaceStats }) {
  return <span className="race-progress-track"><span style={{ width: `${stats.percent}%` }} /></span>;
}

function LeagueStat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return <div className="league-stat"><span>{label}</span><strong>{value}{suffix ? <em> {suffix}</em> : null}</strong></div>;
}

function MetricCard({ icon, label, value, suffix }: { icon: React.ReactNode; label: string; value: string; suffix?: string }) {
  return <div className="metric-card"><span className="metric-icon">{icon}</span><span>{label}</span><strong>{value}{suffix ? <em> {suffix}</em> : null}</strong></div>;
}

function WorkoutDnaCard({
  activity,
  detail
}: {
  activity: TonalDashboard["activities"][number];
  detail?: RecentWorkoutDetail;
}) {
  const title = detail?.name ?? activity.workoutPreview?.workoutTitle ?? activity.activityType ?? "Workout";
  const targetArea = prettifyLabel(detail?.targetArea ?? activity.workoutPreview?.targetArea ?? activity.activityType);
  const duration = detail?.duration ?? activity.workoutPreview?.totalDuration;
  const tensionTime = detail?.timeUnderTension;
  const densitySeconds = tensionTime && tensionTime > 0 ? tensionTime : duration;
  const totalVolume = detail?.totalVolume ?? activity.workoutPreview?.totalVolume;
  const density = totalVolume && densitySeconds ? Math.round(totalVolume / (densitySeconds / 60)) : undefined;
  const movements = topMovements(detail);
  const maxMovementVolume = Math.max(1, ...movements.map((movement) => movement.totalVolume ?? 0));
  const totalSets = detail?.totalSets || countSets(detail);
  const bestSet = findBestSet(detail);
  const suggestedWeightChange = maxSuggestedWeightChange(detail);
  const signalChips = [
    totalSets ? `${formatNumber(totalSets)} sets` : null,
    detail?.totalReps ? `${formatNumber(detail.totalReps)} reps` : null,
    bestSet?.weight ? `Peak ${formatNumber(bestSet.weight)} lb` : null,
    bestSet?.oneRepMax ? `1RM ${formatNumber(bestSet.oneRepMax)} lb` : null,
    bestSet?.maxConPower ? `${formatNumber(bestSet.maxConPower)} W` : null,
    suggestedWeightChange ? `+${formatNumber(suggestedWeightChange)} next time` : null,
    detail?.level ? prettifyLabel(detail.level) : null
  ].filter((signal): signal is string => Boolean(signal));

  return (
    <article className="workout-dna-card">
      <div className="dna-card-topline">
        <span>{activity.activityTime ? formatDate(activity.activityTime) : "Recent"}</span>
        <span>{targetArea}</span>
      </div>
      <h3>{title}</h3>
      <div className="dna-stat-grid">
        <DnaStat label="Volume" value={`${formatNumber(totalVolume)} lb`} />
        <DnaStat label="Tension density" value={density ? `${formatNumber(density)} lb/min` : "—"} />
        <DnaStat label="Time under tension" value={formatDuration(tensionTime ?? duration)} />
      </div>

      <div className="movement-fingerprint">
        <div className="movement-fingerprint-heading">
          <span>Movement telemetry</span>
          <strong>{detail?.totalWork ? `${formatNumber(detail.totalWork)} work` : detail ? "Per-movement" : "Summary only"}</strong>
        </div>
        {movements.length ? (
          <div className="movement-stack">
            {movements.map((movement) => (
              <div className="movement-row" key={movement.movementName ?? movement.totalVolume}>
                <div>
                  <span>{movement.movementName ?? "Movement"}</span>
                  <strong>{formatNumber(movement.totalVolume)} lb</strong>
                </div>
                <div className="bar-track">
                  <div style={{ width: `${Math.max(7, ((movement.totalVolume ?? 0) / maxMovementVolume) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="movement-empty">Detailed movement data was not returned for this workout.</div>
        )}
      </div>

      {signalChips.length ? (
        <div className="dna-signal-row">
          {signalChips.map((signal) => <span key={signal}>{signal}</span>)}
        </div>
      ) : null}
    </article>
  );
}

function DnaStat({ label, value }: { label: string; value: string }) {
  return <div className="dna-stat"><span>{label}</span><strong>{value}</strong></div>;
}

function topMovements(detail?: RecentWorkoutDetail): RecentMovement[] {
  return [...(detail?.movementSets ?? [])]
    .filter((movement) => movement.movementName || movement.totalVolume)
    .sort((a, b) => (b.totalVolume ?? 0) - (a.totalVolume ?? 0))
    .slice(0, 4);
}

function countSets(detail?: RecentWorkoutDetail): number | undefined {
  const count = detail?.movementSets.reduce((sum, movement) => sum + (movement.sets?.length ?? 0), 0) ?? 0;
  return count || undefined;
}

function findBestSet(detail?: RecentWorkoutDetail): RecentSet | undefined {
  return detail?.movementSets
    .flatMap((movement) => movement.sets ?? [])
    .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0) || (b.oneRepMax ?? 0) - (a.oneRepMax ?? 0))[0];
}

function maxSuggestedWeightChange(detail?: RecentWorkoutDetail): number | undefined {
  const suggestion = Math.max(0, ...((detail?.movementSets.flatMap((movement) => movement.sets ?? []) ?? []).map((set) => set.suggestedWeightChange ?? 0)));
  return suggestion || undefined;
}

function prettifyLabel(value?: string | null): string {
  if (!value) return "Workout";
  return value
    .toLowerCase()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
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

function raceStats(value?: number | null): RaceStats {
  const volume = typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
  const percent = Math.min(100, (volume / RACE_TARGET_VOLUME) * 100);
  return {
    volume,
    percent,
    percentLabel: `${Math.round(percent)}%`,
    remaining: Math.max(0, RACE_TARGET_VOLUME - volume),
    complete: volume >= RACE_TARGET_VOLUME
  };
}

function raceRemainingLabel(stats: RaceStats): string {
  return stats.complete ? "Checkered flag claimed" : `${formatNumber(stats.remaining)} lb to the flag`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}
