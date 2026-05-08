"use client";

import {
  ArrowLeft,
  ChevronRight,
  Medal,
  Trophy,
  Users
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  formatDuration,
  formatNumber,
  getMemberDetailInsights,
  isoWeekKey,
  LEADERBOARD_CATEGORIES,
  latestDashboardTimestamp,
  rankMembersForCategory,
  summarizeCalendarDays,
  type MemberDetailInsights,
  type LeaderboardCategoryId,
  type RankedCategoryEntry
} from "@/lib/metrics";
import type { TonalDashboard } from "@/lib/tonal";

type ApiPayload = {
  configured?: boolean;
  message?: string;
  members?: TonalDashboard[];
  error?: string;
};
type AvatarPayload = {
  configured?: boolean;
  avatars?: Record<string, string>;
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
type ChartBucket = {
  key: string;
  label: string;
  endTime: number;
  kind: "day" | "week";
};
type ReadinessLevel = "unknown" | "redline" | "rebuild" | "ready" | "prime";
type RankedTonalMember = RankedCategoryEntry<TonalDashboard>;
const READINESS_LEVELS: Record<ReadinessLevel, { label: string; color: string; range: string }> = {
  unknown: { label: "No signal", color: "#2b3038", range: "—" },
  redline: { label: "Redline", color: "#fb7185", range: "0–39%" },
  rebuild: { label: "Rebuild", color: "#f59e0b", range: "40–69%" },
  ready: { label: "Ready", color: "#38bdf8", range: "70–84%" },
  prime: { label: "Prime", color: "#10b981", range: "85–100%" }
};
const FAMILY_SERIES_COLORS = ["#7170ff", "#10b981", "#f2c879", "#ff6b8a", "#38bdf8", "#c084fc", "#a3e635"];

export default function DashboardApp() {
  const [payload, setPayload] = useState<ApiPayload | null>(null);
  const [avatars, setAvatars] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<View>("leaderboard");
  const [category, setCategory] = useState<LeaderboardCategoryId>("allTimeVolume");
  const [loading, setLoading] = useState(false);
  const [showAvatarAdmin, setShowAvatarAdmin] = useState(false);

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

  async function loadAvatars() {
    try {
      const response = await fetch("/api/avatars");
      const next = (await response.json().catch(() => ({ avatars: {} }))) as AvatarPayload;
      if (response.ok && next.avatars) setAvatars(next.avatars);
    } catch {
      setAvatars({});
    }
  }

  useEffect(() => {
    void load();
    void loadAvatars();
  }, []);

  useEffect(() => {
    function syncFromHash() {
      const hash = window.location.hash;
      setShowAvatarAdmin(hash === "#nimda");
      const memberId = decodeURIComponent(hash.replace(/^#member-/, ""));
      if (memberId && hash.startsWith("#member-")) {
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

  const members = useMemo(() => payload?.members ?? [], [payload?.members]);
  const lastUpdatedAt = useMemo(() => latestDashboardTimestamp(members), [members]);
  const dashboardDate = useMemo(() => lastUpdatedAt ?? new Date(), [lastUpdatedAt]);
  const leaderboard = useMemo(() => rankMembersForCategory(members, category, dashboardDate), [members, category, dashboardDate]);
  const selectedMember = useMemo(
    () => leaderboard.find((candidate) => candidate.member.id === selected) ?? leaderboard[0],
    [leaderboard, selected]
  );

  function navigateToLeaderboard() {
    setView("leaderboard");
    setSelected(null);
    setShowAvatarAdmin(false);
    if (window.location.hash) window.history.pushState(null, "", window.location.pathname);
  }

  function openDetail(memberId: string) {
    setSelected(memberId);
    setView("detail");
    setShowAvatarAdmin(false);
    window.history.pushState(null, "", `#member-${encodeURIComponent(memberId)}`);
  }

  function handleAvatarUploaded(memberId: string, url: string) {
    setAvatars((current) => ({ ...current, [memberId]: url }));
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
          <LastUpdatedPill loading={loading} updatedAt={lastUpdatedAt} />
        </header>

        {payload?.error ? <Notice tone="error">{payload.error}</Notice> : null}
        {payload?.configured === false ? <Notice>{payload.message}</Notice> : null}
        {loading && !payload ? <LoadingState /> : null}
        {showAvatarAdmin ? <AvatarAdminPanel members={members.map((member) => member.member)} onAvatarUploaded={handleAvatarUploaded} /> : null}

        {payload && view === "leaderboard" ? (
          <LeaderboardView
            avatarMap={avatars}
            category={category}
            leaderboard={leaderboard}
            loading={loading}
            onCategoryChange={setCategory}
            onOpenMember={openDetail}
            updatedAt={lastUpdatedAt}
          />
        ) : null}

        {payload && view === "detail" && selectedMember ? (
          <MemberDashboard avatarUrl={avatars[selectedMember.member.id]} data={selectedMember} onBack={navigateToLeaderboard} />
        ) : null}
      </section>
    </main>
  );
}

function LeaderboardView({
  avatarMap,
  category,
  leaderboard,
  loading,
  onCategoryChange,
  onOpenMember,
  updatedAt
}: {
  avatarMap: Record<string, string>;
  category: LeaderboardCategoryId;
  leaderboard: RankedTonalMember[];
  loading: boolean;
  onCategoryChange: (category: LeaderboardCategoryId) => void;
  onOpenMember: (memberId: string) => void;
  updatedAt?: Date;
}) {
  const champion = leaderboard[0];
  const categoryDefinition = LEADERBOARD_CATEGORIES.find((candidate) => candidate.id === category) ?? LEADERBOARD_CATEGORIES[0];
  const chartNow = updatedAt ?? latestDashboardTimestamp(leaderboard) ?? new Date();
  const chartBuckets = familyChartBuckets(leaderboard, category, chartNow);
  const totalFamilyVolume = leaderboard.reduce((sum, member) => sum + member.allTime.totalVolume, 0);
  const totalFamilyWorkouts = leaderboard.reduce((sum, member) => sum + member.allTime.totalWorkouts, 0);
  const familyWeeklyPeak = Math.max(
    0,
    ...leaderboard.flatMap((member) => familyVolumePoints(member, chartBuckets).map((point) => point.value))
  );
  const familyStrengthPeak = Math.max(
    0,
    ...leaderboard.flatMap((member) => familyStrengthScorePoints(member, chartBuckets).map((point) => point.value))
  );

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
          <span>{champion ? (category === "allTimeVolume" ? `${formatNumber(champion.allTime.totalVolume)} lb lifted` : `${champion.leaderboardDisplay} ${champion.leaderboardSuffix}`) : "Add Tonal members to begin."}</span>
        </div>
      </div>

      <div className="league-strip">
        <LeagueStat label="Family volume" value={formatNumber(totalFamilyVolume)} suffix="lb" />
        <LeagueStat label="Tracked workouts" value={formatNumber(totalFamilyWorkouts)} />
        <LeagueStat label="Competitors" value={formatNumber(leaderboard.length)} />
      </div>

      <div className="category-tabs" aria-label="Leaderboard categories" role="tablist">
        {LEADERBOARD_CATEGORIES.map((candidate) => (
          <button
            aria-selected={candidate.id === category}
            className={candidate.id === category ? "category-tab category-tab-active" : "category-tab"}
            key={candidate.id}
            onClick={() => onCategoryChange(candidate.id)}
            role="tab"
            type="button"
          >
            <span>{candidate.label}</span>
            <em>{candidate.description}</em>
          </button>
        ))}
      </div>

      <div className="leaderboard-card">
        <div className="leaderboard-heading">
          <div>
            <h2>{categoryDefinition.standingsTitle}</h2>
            <p>{loading ? "Loading Tonal data…" : "Refresh the page to pull the latest Tonal data. Rank movement compares against the prior matching window."}</p>
          </div>
          <div className="leaderboard-status-row">
            <LastUpdatedPill compact updatedAt={updatedAt} />
            <span className="live-pill"><span /> Page refresh only</span>
          </div>
        </div>

        <div className="leader-list">
          {leaderboard.map((member) => (
            <a className="leader-row" href={`#member-${encodeURIComponent(member.member.id)}`} key={member.member.id} onClick={(event) => { event.preventDefault(); onOpenMember(member.member.id); }}>
              <span className="leader-rank-stack">
                <span className="leader-rank">#{member.rank}</span>
                <RankMovementIndicator member={member} />
              </span>
              <MemberAvatar avatarUrl={avatarMap[member.member.id]} className="leader-avatar" member={member.member} />
              <span className="leader-main">
                <strong>{member.member.name}</strong>
                <span>{member.allTime.totalWorkouts ? `${formatNumber(member.allTime.totalWorkouts)} workouts` : "No workouts loaded yet"}</span>
                <span className="trend-badge-row" aria-label={`${member.member.name} personal trend badges`}>
                  {member.trendBadges.map((badge) => (
                    <span className={`trend-badge trend-badge-${badge.tone}`} key={`${member.member.id}-${badge.label}`}>{badge.label} {badge.value}</span>
                  ))}
                </span>
              </span>
              <span className="leader-volume">
                <strong>{member.leaderboardDisplay}</strong>
                <span>{member.leaderboardSuffix}</span>
              </span>
              <ChevronRight className="leader-chevron" size={18} />
            </a>
          ))}
          {!leaderboard.length ? <Empty title="No family members configured yet" text="Add TONAL_MEMBERS_JSON entries to populate the league." /> : null}
        </div>
      </div>

      <section className="panel family-strength-panel">
        <div className="panel-heading trend-heading">
          <div>
            <h2>Family strength</h2>
            <p>Overall strength score over time on the same time axis.</p>
          </div>
          <span>{familyStrengthPeak ? `${formatNumber(familyStrengthPeak)} peak score` : "No strength data"}</span>
        </div>
        <FamilyStrengthScoreOverlay buckets={chartBuckets} members={leaderboard} />
      </section>

      <section className="panel family-weekly-panel">
        <div className="panel-heading trend-heading">
          <div>
            <h2>Family weekly volume</h2>
            <p>Everyone&apos;s weekly pounds moved on the same time axis.</p>
          </div>
          <span>{familyWeeklyPeak ? `${formatNumber(familyWeeklyPeak)} lb peak week` : "No weekly data"}</span>
        </div>
        <FamilyWeeklyVolumeOverlay buckets={chartBuckets} members={leaderboard} />
      </section>
    </section>
  );
}

function MemberDashboard({ avatarUrl, data, onBack }: { avatarUrl?: string; data: TonalDashboard & { rank: number }; onBack: () => void }) {
  const recentActivities = data.activities.slice(0, 8);
  const recentWorkoutCards = recentActivities.slice(0, 5);
  const strengthTrend = strengthTrendPoints(data);
  const cumulativeVolumeTrend = cumulativeVolumePoints(data.weeklyVolume);
  const strengthDelta = trendDelta(strengthTrend);
  const cumulativeVolumeTotal = cumulativeVolumeTrend.at(-1)?.value ?? data.allTime.totalVolume;
  const detailInsights = useMemo(() => getMemberDetailInsights(data), [data]);
  const detailsByActivity = useMemo(
    () => new Map((data.recentWorkoutDetails ?? []).map((detail) => [detail.activityId, detail])),
    [data.recentWorkoutDetails]
  );
  return (
    <section className="detail-page">
      <a className="back-button" href="#" onClick={(event) => { event.preventDefault(); onBack(); }}><ArrowLeft size={16} /> Back to leaderboard</a>
      {data.errors.length ? <Notice tone="error">{data.errors.join(" • ")}</Notice> : null}

      <div className="athlete-hero" data-section="member-hero">
        <div className="athlete-hero-copy">
          <div className="athlete-identity">
            <MemberAvatar avatarUrl={avatarUrl} className="athlete-avatar" member={data.member} />
            <div>
              <div className="eyebrow"><Users size={14} /> Rank #{data.rank}</div>
              <h1>{data.member.name}</h1>
              <p>
                {data.allTime.firstWorkoutAt ? `Training tracked since ${formatDate(data.allTime.firstWorkoutAt)}.` : "Waiting for workout history."}
              </p>
            </div>
          </div>
        </div>
        <div className="athlete-volume-card">
          <span>All-time volume</span>
          <strong>{formatNumber(data.allTime.totalVolume)}</strong>
          <span>pounds lifted</span>
        </div>
      </div>

      <div className="member-insight-grid">
        <PersonalRecordsPanel insights={detailInsights} />
      </div>

      <div className="strength-style-row" data-section="strength-style-row">
        <StrengthScorePanel data={data} />
        <TrainingStylePanel insights={detailInsights} />
      </div>

      <div className="trend-grid" data-section="trend-row">
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

      <section className="panel readiness-panel" data-section="muscle-readiness">
        <div className="panel-heading"><h2>Muscle readiness</h2><span>{Object.keys(data.readiness).length} muscles tracked</span></div>
        <BodyReadinessDiagram readiness={data.readiness} />
      </section>

      <section className="panel workouts-panel" data-section="workout-dna">
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

      <FavoriteMovementsPanel insights={detailInsights} />
    </section>
  );
}

function MemberAvatar({
  avatarUrl,
  className = "",
  member
}: {
  avatarUrl?: string;
  className?: string;
  member: { id: string; name: string };
}) {
  return (
    <span className={["member-avatar", className].filter(Boolean).join(" ")} data-member-avatar={member.id}>
      {avatarUrl ? <img alt={`${member.name} avatar`} src={avatarUrl} /> : <span aria-hidden="true">{initials(member.name)}</span>}
    </span>
  );
}

function AvatarAdminPanel({
  members,
  onAvatarUploaded
}: {
  members: Array<{ id: string; name: string }>;
  onAvatarUploaded: (memberId: string, url: string) => void;
}) {
  const [adminToken, setAdminToken] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [memberId, setMemberId] = useState("");
  const [status, setStatus] = useState("Choose a member and image to upload a public avatar.");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    try {
      setAdminToken(window.sessionStorage.getItem("tonal-avatar-admin-token") ?? "");
    } catch {
      setAdminToken("");
    }
  }, []);

  useEffect(() => {
    if (!members.length) {
      setMemberId("");
      return;
    }
    if (!memberId || !members.some((member) => member.id === memberId)) setMemberId(members[0].id);
  }, [memberId, members]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const elements = event.currentTarget.elements as typeof event.currentTarget.elements & {
      avatarAdminToken?: HTMLInputElement;
      avatarFile?: HTMLInputElement;
      avatarMemberId?: HTMLSelectElement;
    };
    const token = (elements.avatarAdminToken?.value ?? adminToken).trim();
    const selectedMemberId = elements.avatarMemberId?.value || memberId;
    const selectedFile = elements.avatarFile?.files?.[0] ?? file;
    if (!token) {
      setStatus("Enter the avatar admin code before uploading.");
      return;
    }
    if (!selectedMemberId) {
      setStatus("Load Tonal members before uploading an avatar.");
      return;
    }
    if (!selectedFile) {
      setStatus("Choose a jpeg, png, webp, or gif image first.");
      return;
    }

    setUploading(true);
    setStatus("Uploading avatar...");
    try {
      const formData = new FormData();
      formData.set("memberId", selectedMemberId);
      formData.set("file", selectedFile);
      const response = await fetch("/api/admin/avatars", {
        body: formData,
        headers: { Authorization: `Bearer ${token}` },
        method: "POST"
      });
      const payload = (await response.json().catch(() => ({ error: `Upload failed (${response.status}).` }))) as {
        error?: string;
        memberId?: string;
        url?: string;
      };

      if (!response.ok || !payload.memberId || !payload.url) {
        setStatus(payload.error ?? `Upload failed (${response.status}).`);
        return;
      }

      try {
        window.sessionStorage.setItem("tonal-avatar-admin-token", token);
      } catch {
        // Session storage is optional; the successful upload is the source of truth.
      }
      onAvatarUploaded(payload.memberId, payload.url);
      const member = members.find((candidate) => candidate.id === payload.memberId);
      setStatus(`Uploaded avatar for ${member?.name ?? payload.memberId}.`);
    } catch (error) {
      setStatus((error as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="avatar-admin-panel" aria-label="Avatar admin">
      <div>
        <div className="eyebrow"><Users size={14} /> Avatar admin</div>
        <h2>Member avatar uploads</h2>
        <p>This panel is only exposed from the private hash route. Uploaded images are public because the dashboard displays them publicly.</p>
      </div>
      <form className="avatar-admin-form" onSubmit={handleSubmit}>
        <label>
          <span>Code</span>
          <input
            autoComplete="off"
            name="avatarAdminToken"
            onChange={(event) => setAdminToken(event.currentTarget.value)}
            placeholder="Avatar admin code"
            type="password"
            value={adminToken}
          />
        </label>
        <label>
          <span>Member</span>
          <select name="avatarMemberId" onChange={(event) => setMemberId(event.currentTarget.value)} value={memberId}>
            {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
          </select>
        </label>
        <label>
          <span>Image</span>
          <input
            accept="image/jpeg,image/png,image/webp,image/gif"
            name="avatarFile"
            onChange={(event) => setFile(event.currentTarget.files?.[0] ?? null)}
            type="file"
          />
        </label>
        <button disabled={uploading || !members.length} type="submit">{uploading ? "Uploading..." : "Upload avatar"}</button>
      </form>
      <p className="avatar-admin-status" role="status">{members.length ? status : "Load Tonal members before uploading avatars."}</p>
    </section>
  );
}

function LeagueStat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return <div className="league-stat"><span>{label}</span><strong>{value}{suffix ? <em> {suffix}</em> : null}</strong></div>;
}

function StrengthScorePanel({ data }: { data: TonalDashboard }) {
  return (
    <section className="panel strength-panel" data-section="strength-score">
      <div className="panel-heading"><h2>Strength score</h2><span>Current</span></div>
      <div className="strength-grid">
        <StrengthDial label="Overall" value={data.strength.overall} featured />
        <StrengthDial label="Upper" value={data.strength.upper} />
        <StrengthDial label="Core" value={data.strength.core} />
        <StrengthDial label="Lower" value={data.strength.lower} />
      </div>
    </section>
  );
}

function PersonalRecordsPanel({ insights }: { insights: MemberDetailInsights }) {
  const recordSlots: Array<{ key: keyof MemberDetailInsights["records"]; label: string }> = [
    { key: "heaviestSet", label: "Heaviest set" },
    { key: "bestOneRepMax", label: "Best estimated 1RM" },
    { key: "mostRepsWorkout", label: "Most reps in one workout" },
    { key: "highestVolumeWorkout", label: "Highest volume workout" },
    { key: "peakPower", label: "Peak power" }
  ];

  return (
    <section className="panel personal-records-panel" data-section="personal-records">
      <div className="panel-heading"><h2>Personal records</h2><span>Recent detail</span></div>
      <div className="record-grid">
        {recordSlots.map((slot) => <RecordCard key={slot.key} label={slot.label} record={insights.records[slot.key]} />)}
      </div>
    </section>
  );
}

function RecordCard({ label, record }: { label: string; record?: NonNullable<MemberDetailInsights["records"][keyof MemberDetailInsights["records"]]> }) {
  return (
    <article className={record ? "record-card" : "record-card record-card-empty"}>
      <span>{record?.label ?? label}</span>
      <strong>{record ? `${formatNumber(record.value)} ${record.unit}` : "—"}</strong>
      <em>{record ? recordContext(record) : "Waiting for formatted workout details."}</em>
    </article>
  );
}

function FavoriteMovementsPanel({ insights }: { insights: MemberDetailInsights }) {
  const maxVolume = Math.max(1, ...insights.favoriteMovements.map((movement) => movement.volume));

  return (
    <section className="panel favorite-movements-panel" data-section="favorite-movements">
      <div className="panel-heading">
        <div>
          <h2>Favorite movements</h2>
          <p>Top movement names by recent formatted volume and frequency.</p>
        </div>
        <span>Top {insights.favoriteMovements.length}</span>
      </div>
      <div className="insight-bar-list">
        {insights.favoriteMovements.map((movement) => (
          <div className="insight-bar-row" data-movement={movement.name} key={movement.name}>
            <div>
              <span>{movement.name}</span>
              <em>{formatNumber(movement.frequency)} workout{movement.frequency === 1 ? "" : "s"} • {formatNumber(movement.sets)} sets • {formatNumber(movement.reps)} reps</em>
            </div>
            <strong>{formatNumber(movement.volume)} lb</strong>
            <div className="bar-track"><div style={{ width: `${Math.max(6, (movement.volume / maxVolume) * 100)}%` }} /></div>
          </div>
        ))}
        {!insights.favoriteMovements.length ? <Empty text="Detailed movement sets are needed to rank favorites." /> : null}
      </div>
    </section>
  );
}

function TrainingStylePanel({ insights }: { insights: MemberDetailInsights }) {
  return (
    <section className="panel training-style-panel" data-section="training-style-profile">
      <div className="panel-heading"><h2>Training style</h2><span>Profile</span></div>
      <div className="style-profile-card">
        <span>Current read</span>
        <strong>{insights.trainingStyle.label}</strong>
        <p>Derived from strength trend, workout rhythm, workout mix, and recent workout detail.</p>
        <div className="style-trait-row">
          {insights.trainingStyle.traits.map((trait) => <em key={trait}>{trait}</em>)}
        </div>
      </div>
    </section>
  );
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

function recordContext(record: NonNullable<MemberDetailInsights["records"][keyof MemberDetailInsights["records"]]>): string {
  const context = [
    record.movementName,
    record.workoutName && record.workoutName !== record.movementName ? `in ${record.workoutName}` : undefined,
    record.date ? formatDate(record.date) : undefined
  ].filter(Boolean);
  return context.join(" • ") || "Recent workout detail";
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
  xAxisLabel,
  yAxisLabel,
  zeroBaseline = false
}: {
  points: TrendPoint[];
  dataChart: string;
  dataSeries: string;
  emptyText: string;
  stroke: string;
  valueSuffix?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
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
        {yAxisLabel ? <text className="trend-axis-label trend-axis-label-y" transform={`translate(12 ${height / 2}) rotate(-90)`}>{yAxisLabel}</text> : null}
        {xAxisLabel ? <text className="trend-axis-label trend-axis-label-x" x={width / 2} y={height - 4}>{xAxisLabel}</text> : null}
      </svg>
      <div className="trend-chart-footer">
        <span>{cleanPoints[0].label}</span>
        <strong>{last ? `${formatNumber(last.value)}${valueSuffix}` : "—"}</strong>
        <span>{last?.label ?? cleanPoints[0].label}</span>
      </div>
    </div>
  );
}

function FamilyWeeklyVolumeOverlay({ buckets, members }: { buckets: ChartBucket[]; members: RankedTonalMember[] }) {
  const series = members
    .map((member, index) => ({
      id: member.member.id,
      name: member.member.name,
      color: FAMILY_SERIES_COLORS[index % FAMILY_SERIES_COLORS.length],
      points: familyVolumePoints(member, buckets)
    }))
    .filter((member) => member.points.length);

  if (!series.length || !buckets.length) return <Empty text="No weekly volume data yet." />;

  const width = 760;
  const height = 260;
  const padding = 34;
  const max = Math.max(1, ...series.flatMap((member) => member.points.map((point) => point.value)));
  const baseY = height - padding;
  const range = Math.max(1, Math.ceil(max * 1.12));
  const xForBucket = (index: number) => buckets.length === 1 ? width / 2 : padding + (index / (buckets.length - 1)) * (width - padding * 2);
  const yForValue = (value: number) => padding + ((range - value) / range) * (height - padding * 2);
  const chartSeries = series.map((member) => {
    const coords = member.points.map((point, index) => ({ ...point, x: xForBucket(index), y: yForValue(point.value) }));
    const pathD = coords.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
    return { ...member, coords, pathD, latest: coords.at(-1) };
  });
  const xAxisLabel = buckets[0]?.kind === "day" ? "Day" : "Week";
  const volumeAxisLabel = buckets[0]?.kind === "day" ? "Daily pounds moved" : "Weekly pounds moved";

  return (
    <div className="family-weekly-chart-wrap">
      <svg aria-label="Family weekly volume time series" className="family-weekly-chart" data-chart="family-weekly-volume-overlay" role="img" viewBox={`0 0 ${width} ${height}`}>
        {[0, 1, 2, 3].map((line) => {
          const y = padding + (line / 3) * (height - padding * 2);
          return <line className="trend-grid-line" key={line} x1={padding} x2={width - padding} y1={y} y2={y} />;
        })}
        {chartSeries.map((member) => (
          <g className="family-weekly-series" key={member.id} style={{ "--series-color": member.color } as React.CSSProperties}>
            <title>{member.name} weekly volume</title>
            <path className="family-weekly-line" d={member.pathD} data-series={`weekly-volume-${member.id}`} fill="none" stroke={member.color} />
            {member.coords.map((point) => (
              <circle className="family-weekly-point" cx={point.x} cy={point.y} key={`${member.id}-${point.sortKey}`} r="3.8">
                <title>{member.name} {point.label}: {formatNumber(point.value)} lb</title>
              </circle>
            ))}
          </g>
        ))}
        <text className="trend-y-label" x={padding} y={padding - 10}>{formatNumber(range)}</text>
        <text className="trend-y-label" x={padding} y={baseY + 18}>0</text>
        <text className="trend-axis-label trend-axis-label-y" transform={`translate(13 ${height / 2}) rotate(-90)`}>Volume</text>
        <text className="trend-axis-label trend-axis-label-x" x={width / 2} y={height - 5}>{xAxisLabel}</text>
      </svg>
      <div className="family-weekly-axis-row">
        <span>{buckets[0].label}</span>
        <strong>{volumeAxisLabel}</strong>
        <span>{buckets.at(-1)?.label}</span>
      </div>
      <div className="family-weekly-legend">
        {chartSeries.map((member) => (
          <span data-series-legend={`weekly-volume-${member.id}`} key={member.id}>
            <i style={{ background: member.color }} />
            {member.name}
            <strong>{formatNumber(member.latest?.value ?? 0)} lb</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

function FamilyStrengthScoreOverlay({ buckets, members }: { buckets: ChartBucket[]; members: RankedTonalMember[] }) {
  const series = members
    .map((member, index) => ({
      id: member.member.id,
      name: member.member.name,
      color: FAMILY_SERIES_COLORS[index % FAMILY_SERIES_COLORS.length],
      points: familyStrengthScorePoints(member, buckets)
    }))
    .filter((member) => member.points.length);

  if (!series.length || !buckets.length) return <Empty text="No overall strength score history returned yet." />;

  const width = 760;
  const height = 260;
  const padding = 34;
  const values = series.flatMap((member) => member.points.map((point) => point.value));
  const minRaw = Math.min(...values);
  const maxRaw = Math.max(...values);
  const spread = Math.max(1, maxRaw - minRaw);
  const min = Math.max(0, Math.floor(minRaw - spread * 0.4));
  const max = maxRaw === minRaw ? maxRaw + 1 : Math.ceil(maxRaw + spread * 0.25);
  const range = Math.max(1, max - min);
  const baseY = height - padding;
  const bucketIndex = new Map(buckets.map((bucket, index) => [bucket.key, index]));
  const xForKey = (key: string) => {
    const index = bucketIndex.get(key) ?? 0;
    return buckets.length === 1 ? width / 2 : padding + (index / (buckets.length - 1)) * (width - padding * 2);
  };
  const yForValue = (value: number) => padding + ((max - value) / range) * (height - padding * 2);
  const chartSeries = series.map((member) => {
    const coords = member.points
      .map((point) => ({ ...point, x: xForKey(point.sortKey), y: yForValue(point.value) }));
    const pathD = coords.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
    return { ...member, coords, pathD, latest: coords.at(-1) };
  });

  return (
    <div className="family-strength-chart-wrap">
      <svg aria-label="Family overall strength score time series" className="family-strength-chart" data-chart="family-strength-score-overlay" role="img" viewBox={`0 0 ${width} ${height}`}>
        {[0, 1, 2, 3].map((line) => {
          const y = padding + (line / 3) * (height - padding * 2);
          return <line className="trend-grid-line" key={line} x1={padding} x2={width - padding} y1={y} y2={y} />;
        })}
        {chartSeries.map((member) => (
          <g className="family-strength-series" key={member.id} style={{ "--series-color": member.color } as React.CSSProperties}>
            <title>{member.name} strength score history</title>
            <path className="family-strength-line" d={member.pathD} data-series={`strength-score-${member.id}`} fill="none" stroke={member.color}>
              {buckets.length === 1 ? <title>{member.name} latest: {formatNumber(member.latest?.value)} strength score</title> : null}
            </path>
            {member.coords.map((point) => (
              <circle className="family-strength-point" cx={point.x} cy={point.y} key={`${member.id}-${point.sortKey}`} r="3.8">
                <title>{member.name} {point.label}: {formatNumber(point.value)} strength score</title>
              </circle>
            ))}
          </g>
        ))}
        <text className="trend-y-label" x={padding} y={padding - 10}>{formatNumber(max)}</text>
        <text className="trend-y-label" x={padding} y={baseY + 18}>{formatNumber(min)}</text>
        <text className="trend-axis-label trend-axis-label-y" transform={`translate(13 ${height / 2}) rotate(-90)`}>Strength</text>
        <text className="trend-axis-label trend-axis-label-x" x={width / 2} y={height - 5}>Snapshot</text>
      </svg>
      <div className="family-strength-axis-row">
        <span>{buckets[0].label}</span>
        <strong>Overall strength score</strong>
        <span>{buckets.at(-1)?.label}</span>
      </div>
      <div className="family-strength-legend">
        {chartSeries.map((member) => (
          <span data-series-legend={`strength-score-${member.id}`} key={member.id}>
            <i style={{ background: member.color }} />
            {member.name} <strong>{formatNumber(member.latest?.value ?? 0)}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

function familyChartBuckets(members: RankedTonalMember[], category: LeaderboardCategoryId, now: Date): ChartBucket[] {
  if (category === "thisMonthVolume" || category === "fairnessAdjusted") return rollingDayBuckets(now, 30);
  if (category === "thisWeekVolume" && familyHasDailyTrainingData(members)) return currentWeekDayBuckets(now);

  const availableWeeks = Array.from(new Set(members.flatMap((member) => member.weeklyVolume.map((week) => week.week).filter(isIsoWeekKey))))
    .sort((a, b) => a.localeCompare(b));

  if (category === "thisWeekVolume") return [isoWeekKey(now)].map(weekChartBucket);
  return availableWeeks.map(weekChartBucket);
}

function rollingDayBuckets(now: Date, dayCount: number): ChartBucket[] {
  const end = startOfUtcDay(now);
  return dayChartBuckets(addUtcDays(end, 1 - dayCount), dayCount);
}

function currentWeekDayBuckets(now: Date): ChartBucket[] {
  return dayChartBuckets(isoWeekStartDate(isoWeekKey(now)) ?? startOfUtcDay(now), 7);
}

function dayChartBuckets(start: Date, dayCount: number): ChartBucket[] {
  return Array.from({ length: dayCount }, (_, index) => {
    const date = addUtcDays(start, index);
    const end = new Date(date);
    end.setUTCHours(23, 59, 59, 999);
    const key = utcDateKey(date);
    return { key, label: formatDateKeyLabel(key), endTime: end.getTime(), kind: "day" };
  });
}

function weekChartBucket(week: string): ChartBucket {
  return { key: week, label: week, endTime: isoWeekEndDate(week)?.getTime() ?? 0, kind: "week" };
}

function familyHasDailyTrainingData(members: RankedTonalMember[]): boolean {
  return members.some((member) => member.calendarDays?.length || member.activities?.some((activity) => activity.activityTime));
}

function familyVolumePoints(member: TonalDashboard, buckets: ChartBucket[]): Array<TrendPoint & { sortKey: string }> {
  const dailyVolume = new Map<string, number>();
  const weeklyVolume = new Map<string, number>();

  if (buckets.some((bucket) => bucket.kind === "day")) {
    for (const day of memberDailyTrainingDays(member)) {
      dailyVolume.set(day.date, (dailyVolume.get(day.date) ?? 0) + Math.max(0, Math.round(day.volume)));
    }
  }
  if (buckets.some((bucket) => bucket.kind === "week")) {
    for (const week of member.weeklyVolume) {
      weeklyVolume.set(week.week, Math.max(0, Math.round(week.volume)));
    }
  }

  return buckets.map((bucket) => ({
    label: bucket.label,
    sortKey: bucket.key,
    value: bucket.kind === "day" ? dailyVolume.get(bucket.key) ?? 0 : weeklyVolume.get(bucket.key) ?? 0
  }));
}

function memberDailyTrainingDays(member: TonalDashboard): TonalDashboard["calendarDays"] {
  return member.calendarDays?.length ? member.calendarDays : summarizeCalendarDays(member.activities ?? []);
}

function familyStrengthScorePoints(member: TonalDashboard, buckets: ChartBucket[]): Array<TrendPoint & { sortKey: string }> {
  const snapshots = strengthSnapshotsForBuckets(member, buckets);
  if (!snapshots.length || !buckets.length) return [];

  let latest: { value: number } | undefined;
  let snapshotIndex = 0;
  const points: Array<TrendPoint & { sortKey: string }> = [];

  for (const bucket of buckets) {
    while (snapshotIndex < snapshots.length && snapshots[snapshotIndex].time <= bucket.endTime) {
      latest = snapshots[snapshotIndex];
      snapshotIndex += 1;
    }
    if (latest) points.push({ label: bucket.label, sortKey: bucket.key, value: latest.value });
  }

  return points;
}

function strengthSnapshotsForBuckets(member: TonalDashboard, buckets: ChartBucket[]): Array<{ time: number; value: number; order: number }> {
  const snapshots = (member.strengthHistory ?? [])
    .map((entry, index) => {
      const time = timestamp(entry.activityTime);
      const value = positiveStrengthScore(entry.overall);
      return time === undefined || value === undefined ? undefined : { time, value, order: index };
    })
    .filter((entry): entry is { time: number; value: number; order: number } => Boolean(entry));
  const current = positiveStrengthScore(member.strength.overall);
  if (current !== undefined) {
    const currentTime = timestamp(member.fetchedAt) ?? buckets.at(-1)?.endTime;
    if (currentTime !== undefined) snapshots.push({ time: currentTime, value: current, order: Number.MAX_SAFE_INTEGER });
  }

  return snapshots.sort((a, b) => a.time - b.time || a.order - b.order);
}

function BodyReadinessDiagram({ readiness }: { readiness: Record<string, number> }) {
  const readyMuscles = Object.entries(readiness)
    .filter(([, value]) => typeof value === "number" && Number.isFinite(value))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const averageReadiness = readyMuscles.length
    ? Math.round(readyMuscles.reduce((sum, [, score]) => sum + score, 0) / readyMuscles.length)
    : 0;
  const primedCount = readyMuscles.filter(([, score]) => readinessLevel(score) === "prime").length;
  const redlineCount = readyMuscles.filter(([, score]) => readinessLevel(score) === "redline").length;

  if (!readyMuscles.length) return <Empty text="No readiness data returned." />;

  return (
    <div className="body-readiness-layout">
      <div className="body-readiness-stage">
        <svg aria-label="Body muscle readiness diagram" className="body-readiness-diagram" data-chart="muscle-readiness-body-map" role="img" viewBox="0 0 560 390">
          <defs>
            <filter id="readiness-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <radialGradient id="readiness-body-aura" cx="50%" cy="45%" r="55%">
              <stop offset="0%" stopColor="#7170ff" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#7170ff" stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse className="body-aura" cx="165" cy="205" rx="116" ry="176" />
          <ellipse className="body-aura" cx="398" cy="205" rx="116" ry="176" />
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
        <div className="readiness-summary-card">
          <span>Readiness scores</span>
          <strong>{averageReadiness}% avg</strong>
          <em>{formatNumber(primedCount)} primed • {formatNumber(redlineCount)} redline</em>
        </div>
        <div className="readiness-chip-grid" aria-label="Compact muscle readiness scores">
          {readyMuscles.map(([muscle, score]) => {
            const level = readinessLevel(score);
            return (
              <span
                data-readiness-chip={muscle}
                key={muscle}
                style={{ "--chip-color": READINESS_LEVELS[level].color } as React.CSSProperties}
              >
                <i />
                {muscle}
                <strong>{Math.round(score)}%</strong>
              </span>
            );
          })}
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

function Notice({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "error" }) {
  return <div className={tone === "error" ? "notice notice-error" : "notice"}>{children}</div>;
}

function Empty({ text, title }: { text: string; title?: string }) {
  return <div className="empty-state">{title ? <strong>{title}</strong> : null}<span>{text}</span></div>;
}

function LastUpdatedPill({ compact = false, loading = false, updatedAt }: { compact?: boolean; loading?: boolean; updatedAt?: Date }) {
  const label = loading && !updatedAt ? "Fetching now" : updatedAt ? formatUpdatedAt(updatedAt) : "Waiting for first sync";
  return <div className={compact ? "updated-pill updated-pill-compact" : "updated-pill"}><span>Last updated</span><strong>{label}</strong></div>;
}

function RankMovementIndicator({ member }: { member: RankedTonalMember }) {
  const aria = member.rankMovementTone === "up"
    ? `${member.member.name} moved up ${member.rankMovement} rank${member.rankMovement === 1 ? "" : "s"}`
    : member.rankMovementTone === "down"
      ? `${member.member.name} moved down ${Math.abs(member.rankMovement)} rank${Math.abs(member.rankMovement) === 1 ? "" : "s"}`
      : member.rankMovementTone === "new"
        ? `${member.member.name} is new in this category window`
        : `${member.member.name} had no rank change`;
  return <span aria-label={aria} className={`rank-movement rank-movement-${member.rankMovementTone}`}>{member.rankMovementLabel}</span>;
}

function LoadingState() {
  return (
    <section className="loading-state">
      <div className="loading-hero">
        <div className="eyebrow"><Medal size={14} /> Syncing family board</div>
        <h1>Warming up Tonal data…</h1>
        <p>Pulling family strength signals, readiness, recent workouts, and leaderboard history. This can take a moment.</p>
      </div>
      <LeaderboardSkeleton />
    </section>
  );
}

function LeaderboardSkeleton() {
  return <div className="leaderboard-card skeleton-card"><div /><div /><div /></div>;
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";
}

function strengthTrendPoints(data: TonalDashboard): TrendPoint[] {
  const points = (data.strengthHistory ?? [])
    .map((entry, index) => {
      const time = timestamp(entry.activityTime);
      const value = positiveStrengthScore(entry.overall);
      return time === undefined || value === undefined
        ? undefined
        : { label: formatShortDate(entry.activityTime), order: index, time, value };
    })
    .filter((entry): entry is TrendPoint & { order: number; time: number } => Boolean(entry));
  const current = positiveStrengthScore(data.strength.overall);
  if (current !== undefined) {
    const fetchedAtTime = timestamp(data.fetchedAt);
    const latestHistoryTime = Math.max(0, ...points.map((point) => point.time));
    points.push({
      label: data.fetchedAt && fetchedAtTime !== undefined ? formatShortDate(data.fetchedAt) : "Current",
      order: Number.MAX_SAFE_INTEGER,
      time: fetchedAtTime ?? latestHistoryTime + 1,
      value: current
    });
  }

  return points
    .sort((a, b) => a.time - b.time || a.order - b.order)
    .map(({ label, value }) => ({ label, value }));
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

function positiveStrengthScore(value?: number | null): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.round(value) : undefined;
}

function timestamp(value?: string | null): number | undefined {
  if (!value) return undefined;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : undefined;
}

function isIsoWeekKey(value: string): boolean {
  return /^\d{4}-W\d{2}$/.test(value) && Boolean(isoWeekStartDate(value));
}

function isoWeekEndDate(week: string): Date | undefined {
  const start = isoWeekStartDate(week);
  if (!start) return undefined;
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  end.setUTCHours(23, 59, 59, 999);
  return end;
}

function isoWeekStartDate(week: string): Date | undefined {
  const match = /^(\d{4})-W(\d{2})$/.exec(week);
  if (!match) return undefined;
  const year = Number(match[1]);
  const weekNumber = Number(match[2]);
  if (!Number.isInteger(year) || !Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > 53) return undefined;
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() + 1 - jan4Day + (weekNumber - 1) * 7);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date: Date, days: number): Date {
  const copy = startOfUtcDay(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function utcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatDateKeyLabel(value: string): string {
  const date = parseDateKey(value);
  return date
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(date)
    : value;
}

function parseDateKey(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return Number.isNaN(date.getTime()) ? undefined : date;
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

function formatUpdatedAt(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short"
  }).format(value);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function formatShortDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(value));
}
