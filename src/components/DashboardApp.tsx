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
type TrendPoint = {
  label: string;
  value: number;
};
type ReadinessLevel = "unknown" | "redline" | "rebuild" | "ready" | "prime";
const READINESS_LEVELS: Record<ReadinessLevel, { label: string; color: string; range: string }> = {
  unknown: { label: "No signal", color: "#2b3038", range: "—" },
  redline: { label: "Redline", color: "#fb7185", range: "0–39%" },
  rebuild: { label: "Rebuild", color: "#f59e0b", range: "40–69%" },
  ready: { label: "Ready", color: "#38bdf8", range: "70–84%" },
  prime: { label: "Prime", color: "#10b981", range: "85–100%" }
};

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
            <p>{loading ? "Loading Tonal data…" : "Refresh the page to pull the latest Tonal data."}</p>
          </div>
          <span className="live-pill"><span /> Page refresh only</span>
        </div>

        <div className="leader-list">
          {leaderboard.map((member) => (
            <a className="leader-row" href={`#member-${encodeURIComponent(member.member.id)}`} key={member.member.id} onClick={(event) => { event.preventDefault(); onOpenMember(member.member.id); }}>
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
  const recentWorkoutCards = recentActivities.slice(0, 5);
  const strengthTrend = strengthTrendPoints(data);
  const cumulativeVolumeTrend = cumulativeVolumePoints(data.weeklyVolume);
  const strengthDelta = trendDelta(strengthTrend);
  const cumulativeVolumeTotal = cumulativeVolumeTrend.at(-1)?.value ?? data.allTime.totalVolume;
  const detailsByActivity = useMemo(
    () => new Map((data.recentWorkoutDetails ?? []).map((detail) => [detail.activityId, detail])),
    [data.recentWorkoutDetails]
  );
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

      <div className="trend-grid">
        <section className="panel trend-panel">
          <div className="panel-heading trend-heading">
            <div>
              <h2>Strength score over time</h2>
              <p>Overall Tonal strength score pulled from historical score snapshots.</p>
            </div>
            <span>{strengthDelta !== undefined ? `${strengthDelta >= 0 ? "+" : ""}${formatNumber(strengthDelta)} overall` : "No trend"}</span>
          </div>
          <TrendLineChart
            dataChart="strength-score-history"
            dataSeries="overall-strength"
            emptyText="No strength history returned yet."
            points={strengthTrend}
            stroke="var(--gold)"
          />
        </section>

        <section className="panel trend-panel">
          <div className="panel-heading trend-heading">
            <div>
              <h2>Total weight moved over time</h2>
              <p>Cumulative pounds moved across logged Tonal workouts.</p>
            </div>
            <span>{formatNumber(cumulativeVolumeTotal)} lb total</span>
          </div>
          <TrendLineChart
            dataChart="cumulative-volume-history"
            dataSeries="cumulative-volume"
            emptyText="No volume history returned yet."
            points={cumulativeVolumeTrend}
            stroke="var(--success)"
            valueSuffix=" lb"
            zeroBaseline
          />
        </section>
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
          <div className="panel-heading"><h2>Muscle readiness</h2><span>Body readiness map</span></div>
          <BodyReadinessDiagram readiness={data.readiness} />
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
        <div className="panel-heading workout-dna-heading">
          <div>
            <h2>Workout DNA</h2>
            <p>Movement fingerprint cards built from Tonal&apos;s formatted per-movement summaries.</p>
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

function TrendLineChart({
  points,
  dataChart,
  dataSeries,
  emptyText,
  stroke,
  valueSuffix = "",
  zeroBaseline = false
}: {
  points: TrendPoint[];
  dataChart: string;
  dataSeries: string;
  emptyText: string;
  stroke: string;
  valueSuffix?: string;
  zeroBaseline?: boolean;
}) {
  const cleanPoints = points.filter((point) => Number.isFinite(point.value));
  if (!cleanPoints.length) return <Empty text={emptyText} />;

  const width = 520;
  const height = 220;
  const padding = 28;
  const minRaw = Math.min(...cleanPoints.map((point) => point.value));
  const maxRaw = Math.max(...cleanPoints.map((point) => point.value));
  const spread = Math.max(1, maxRaw - minRaw);
  const min = zeroBaseline ? 0 : Math.max(0, Math.floor(minRaw - spread * 0.4));
  const max = maxRaw === minRaw ? maxRaw + 1 : Math.ceil(maxRaw + spread * 0.25);
  const range = Math.max(1, max - min);
  const baseY = height - padding;
  const coords = cleanPoints.map((point, index) => {
    const x = cleanPoints.length === 1
      ? width / 2
      : padding + (index / (cleanPoints.length - 1)) * (width - padding * 2);
    const y = padding + ((max - point.value) / range) * (height - padding * 2);
    return { ...point, x, y };
  });
  const pathD = coords.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
  const areaD = `${pathD} L ${coords.at(-1)?.x.toFixed(1)} ${baseY} L ${coords[0].x.toFixed(1)} ${baseY} Z`;
  const last = cleanPoints.at(-1);

  return (
    <div className="trend-chart-wrap" style={{ "--trend-color": stroke } as React.CSSProperties}>
      <svg aria-label={dataChart} className="trend-chart" data-chart={dataChart} role="img" viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id={`${dataChart}-fade`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.24" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {[0, 1, 2].map((line) => {
          const y = padding + (line / 2) * (height - padding * 2);
          return <line className="trend-grid-line" key={line} x1={padding} x2={width - padding} y1={y} y2={y} />;
        })}
        <path className="trend-area" d={areaD} fill={`url(#${dataChart}-fade)`} />
        <path className="trend-line" d={pathD} data-series={dataSeries} fill="none" stroke={stroke} />
        {coords.map((point) => (
          <g className="trend-point" key={`${point.label}-${point.value}`}>
            <title>{point.label}: {formatNumber(point.value)}{valueSuffix}</title>
            <circle cx={point.x} cy={point.y} r="4.5" />
          </g>
        ))}
        <text className="trend-y-label" x={padding} y={padding - 8}>{formatNumber(max)}</text>
        <text className="trend-y-label" x={padding} y={baseY + 18}>{formatNumber(min)}</text>
      </svg>
      <div className="trend-chart-footer">
        <span>{cleanPoints[0].label}</span>
        <strong>{last ? `${formatNumber(last.value)}${valueSuffix}` : "—"}</strong>
        <span>{last?.label ?? cleanPoints[0].label}</span>
      </div>
    </div>
  );
}

function BodyReadinessDiagram({ readiness }: { readiness: Record<string, number> }) {
  const readyMuscles = Object.entries(readiness)
    .filter(([, value]) => typeof value === "number" && Number.isFinite(value))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  if (!readyMuscles.length) return <Empty text="No readiness data returned." />;

  return (
    <div className="body-readiness-layout">
      <div className="body-readiness-stage">
        <svg aria-label="Body readiness heat map" className="body-readiness-diagram" role="img" viewBox="0 0 560 390">
          <defs>
            <filter id="readiness-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <text className="body-view-label" x="165" y="24">Front</text>
          <text className="body-view-label" x="398" y="24">Back</text>
          <BodyBase side="front" />
          <BodyBase side="back" />

          <MuscleZone labelX={165} labelY={86} muscle="Shoulders" score={readinessScore(readiness, "Shoulders")}>
            <ellipse cx="126" cy="86" rx="26" ry="17" transform="rotate(-22 126 86)" />
            <ellipse cx="204" cy="86" rx="26" ry="17" transform="rotate(22 204 86)" />
            <ellipse cx="359" cy="86" rx="25" ry="16" transform="rotate(22 359 86)" />
            <ellipse cx="437" cy="86" rx="25" ry="16" transform="rotate(-22 437 86)" />
          </MuscleZone>
          <MuscleZone labelX={165} labelY={116} muscle="Chest" score={readinessScore(readiness, "Chest")}>
            <path d="M137 99 C146 82 163 86 165 106 L165 132 C149 132 136 120 137 99Z" />
            <path d="M193 99 C184 82 167 86 165 106 L165 132 C181 132 194 120 193 99Z" />
          </MuscleZone>
          <MuscleZone labelX={165} labelY={164} muscle="Abs" score={readinessScore(readiness, "Abs")}>
            <rect x="153" y="136" width="24" height="20" rx="8" />
            <rect x="153" y="160" width="24" height="20" rx="8" />
            <rect x="153" y="184" width="24" height="20" rx="8" />
          </MuscleZone>
          <MuscleZone labelX={165} labelY={176} muscle="Obliques" score={readinessScore(readiness, "Obliques")}>
            <path d="M134 136 C145 146 149 177 139 204 C126 188 124 154 134 136Z" />
            <path d="M196 136 C185 146 181 177 191 204 C204 188 206 154 196 136Z" />
          </MuscleZone>
          <MuscleZone labelX={103} labelY={154} muscle="Biceps" score={readinessScore(readiness, "Biceps")}>
            <ellipse cx="107" cy="145" rx="13" ry="42" transform="rotate(12 107 145)" />
            <ellipse cx="223" cy="145" rx="13" ry="42" transform="rotate(-12 223 145)" />
          </MuscleZone>
          <MuscleZone labelX={165} labelY={254} muscle="Quads" score={readinessScore(readiness, "Quads")}>
            <path d="M139 216 C153 211 164 219 162 242 L154 309 C134 311 126 299 131 274Z" />
            <path d="M191 216 C177 211 166 219 168 242 L176 309 C196 311 204 299 199 274Z" />
          </MuscleZone>
          <MuscleZone labelX={165} labelY={343} muscle="Calves" score={readinessScore(readiness, "Calves")}>
            <path d="M134 305 C151 301 158 315 153 360 C136 363 128 353 131 331Z" />
            <path d="M196 305 C179 301 172 315 177 360 C194 363 202 353 199 331Z" />
            <path d="M360 305 C377 301 384 315 379 360 C362 363 354 353 357 331Z" />
            <path d="M422 305 C405 301 398 315 403 360 C420 363 428 353 425 331Z" />
          </MuscleZone>
          <MuscleZone labelX={398} labelY={148} muscle="Back" score={readinessScore(readiness, "Back")}>
            <path d="M366 99 C382 86 395 91 398 123 L398 205 C375 192 359 163 366 99Z" />
            <path d="M430 99 C414 86 401 91 398 123 L398 205 C421 192 437 163 430 99Z" />
          </MuscleZone>
          <MuscleZone labelX={459} labelY={154} muscle="Triceps" score={readinessScore(readiness, "Triceps")}>
            <ellipse cx="340" cy="145" rx="12" ry="42" transform="rotate(-12 340 145)" />
            <ellipse cx="456" cy="145" rx="12" ry="42" transform="rotate(12 456 145)" />
          </MuscleZone>
          <MuscleZone labelX={398} labelY={224} muscle="Glutes" score={readinessScore(readiness, "Glutes")}>
            <ellipse cx="384" cy="218" rx="22" ry="24" />
            <ellipse cx="412" cy="218" rx="22" ry="24" />
          </MuscleZone>
          <MuscleZone labelX={398} labelY={276} muscle="Hamstrings" score={readinessScore(readiness, "Hamstrings")}>
            <path d="M368 238 C386 232 395 244 391 274 L382 315 C362 316 356 302 361 276Z" />
            <path d="M428 238 C410 232 401 244 405 274 L414 315 C434 316 440 302 435 276Z" />
          </MuscleZone>
        </svg>
      </div>

      <div className="readiness-sidecar">
        <div className="readiness-legend" aria-label="Readiness color legend">
          {(Object.keys(READINESS_LEVELS) as ReadinessLevel[]).filter((level) => level !== "unknown").map((level) => (
            <span key={level}><i style={{ background: READINESS_LEVELS[level].color }} />{READINESS_LEVELS[level].label}<em>{READINESS_LEVELS[level].range}</em></span>
          ))}
        </div>
        <div className="readiness-list compact-readiness-list">
          {readyMuscles.slice(0, 5).map(([muscle, score]) => <ReadinessRow key={muscle} muscle={muscle} score={score} />)}
        </div>
      </div>
    </div>
  );
}

function BodyBase({ side }: { side: "front" | "back" }) {
  const offset = side === "front" ? 0 : 233;
  return (
    <g className="body-base" aria-hidden="true">
      <circle cx={165 + offset} cy="55" r="21" />
      <path d={`M${165 + offset} 78 C${132 + offset} 78 ${121 + offset} 100 ${128 + offset} 128 L${113 + offset} 202 C${109 + offset} 222 ${126 + offset} 231 ${137 + offset} 212 L${149 + offset} 156 L${149 + offset} 220 L${130 + offset} 338 C${127 + offset} 357 ${148 + offset} 366 ${158 + offset} 348 L${165 + offset} 270 L${172 + offset} 348 C${182 + offset} 366 ${203 + offset} 357 ${200 + offset} 338 L${181 + offset} 220 L${181 + offset} 156 L${193 + offset} 212 C${204 + offset} 231 ${221 + offset} 222 ${217 + offset} 202 L${202 + offset} 128 C${209 + offset} 100 ${198 + offset} 78 ${165 + offset} 78Z`} />
    </g>
  );
}

function MuscleZone({
  children,
  labelX,
  labelY,
  muscle,
  score
}: {
  children: React.ReactNode;
  labelX: number;
  labelY: number;
  muscle: string;
  score?: number;
}) {
  const level = readinessLevel(score);
  const color = READINESS_LEVELS[level].color;
  const tooltip = score === undefined ? `${muscle} no readiness signal` : `${muscle} ${Math.round(score)}%`;
  return (
    <g
      className="body-muscle"
      data-muscle={muscle}
      data-readiness-level={level}
      data-tooltip={tooltip}
      style={{ "--muscle-color": color } as React.CSSProperties}
      tabIndex={0}
    >
      <title>{score === undefined ? `${muscle} readiness unavailable` : `${muscle} ${Math.round(score)}% readiness`}</title>
      {children}
      <text className="readiness-hover-label" x={labelX} y={labelY}>{tooltip}</text>
    </g>
  );
}

function ReadinessRow({ muscle, score }: { muscle: string; score: number }) {
  const level = readinessLevel(score);
  return <div className="readiness-row"><div><span>{muscle}</span><strong>{Math.round(score)}%</strong></div><div className="bar-track"><div style={{ background: READINESS_LEVELS[level].color, width: `${Math.max(3, Math.min(100, score))}%` }} /></div></div>;
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

function strengthTrendPoints(data: TonalDashboard): TrendPoint[] {
  const history = (data.strengthHistory ?? [])
    .map((entry) => ({ label: formatShortDate(entry.activityTime), value: entry.overall }))
    .filter((entry): entry is TrendPoint => typeof entry.value === "number" && Number.isFinite(entry.value));
  if (history.length) return history;
  return typeof data.strength.overall === "number" ? [{ label: "Current", value: data.strength.overall }] : [];
}

function cumulativeVolumePoints(weeks: TonalDashboard["weeklyVolume"]): TrendPoint[] {
  let cumulative = 0;
  return [...weeks]
    .sort((a, b) => a.week.localeCompare(b.week))
    .map((week) => {
      cumulative += Math.max(0, Math.round(week.volume));
      return { label: week.week, value: cumulative };
    });
}

function trendDelta(points: TrendPoint[]): number | undefined {
  if (points.length < 2) return undefined;
  return Math.round(points.at(-1)!.value - points[0].value);
}

function readinessScore(readiness: Record<string, number>, muscle: string): number | undefined {
  const exact = readiness[muscle];
  if (typeof exact === "number" && Number.isFinite(exact)) return Math.max(0, Math.min(100, exact));
  const normalizedMuscle = muscle.toLowerCase();
  const match = Object.entries(readiness).find(([candidate, value]) => candidate.toLowerCase() === normalizedMuscle && typeof value === "number" && Number.isFinite(value));
  return match ? Math.max(0, Math.min(100, match[1])) : undefined;
}

function readinessLevel(score?: number): ReadinessLevel {
  if (score === undefined) return "unknown";
  if (score < 40) return "redline";
  if (score < 70) return "rebuild";
  if (score < 85) return "ready";
  return "prime";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function formatShortDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(value));
}
