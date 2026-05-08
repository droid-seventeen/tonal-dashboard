export type StrengthScoreInput = {
  strengthBodyRegion?: string | null;
  bodyRegionDisplay?: string | null;
  score?: number | null;
};

export type NormalizedStrengthScores = {
  overall?: number;
  upper?: number;
  lower?: number;
  core?: number;
};

export type StrengthHistoryInput = {
  activityTime?: string | null;
  overall?: number | null;
  upper?: number | null;
  lower?: number | null;
  core?: number | null;
};

export type StrengthHistoryPoint = {
  activityTime: string;
  overall?: number;
  upper?: number;
  lower?: number;
  core?: number;
};

export type ActivityInput = {
  activityTime?: string | null;
  workoutPreview?: {
    totalVolume?: number | null;
  } | null;
};

export type WorkoutActivityInput = {
  beginTime?: string | null;
  endTime?: string | null;
  totalVolume?: number | null;
  totalReps?: number | null;
  totalDuration?: number | null;
  activeDuration?: number | null;
};

export type AllTimeStats = {
  totalVolume: number;
  totalWorkouts: number;
  totalReps: number;
  totalDuration: number;
  firstWorkoutAt?: string;
  lastWorkoutAt?: string;
};

export type LeaderboardEntry<T extends { member: { id: string; name: string }; allTime: { totalVolume: number } }> = T & {
  rank: number;
};

export type WeeklyVolume = {
  week: string;
  workouts: number;
  volume: number;
};

export type LeaderboardCategoryId = "allTimeVolume" | "thisMonthVolume" | "thisWeekVolume" | "workouts" | "fairnessAdjusted";

export type LeaderboardCategoryDefinition = {
  id: LeaderboardCategoryId;
  label: string;
  standingsTitle: string;
  description: string;
};

export const LEADERBOARD_CATEGORIES: LeaderboardCategoryDefinition[] = [
  {
    id: "allTimeVolume",
    label: "All-time",
    standingsTitle: "Volume standings",
    description: "Lifetime pounds moved"
  },
  {
    id: "thisMonthVolume",
    label: "This month",
    standingsTitle: "This month standings",
    description: "Current calendar month"
  },
  {
    id: "thisWeekVolume",
    label: "This week",
    standingsTitle: "This week standings",
    description: "Current ISO training week"
  },
  {
    id: "workouts",
    label: "Workouts",
    standingsTitle: "Workout standings",
    description: "All-time workout count"
  },
  {
    id: "fairnessAdjusted",
    label: "Fairness adjusted",
    standingsTitle: "Fairness adjusted standings",
    description: "Momentum vs personal baseline"
  }
];

export type DashboardMetricMember = {
  member: { id: string; name: string };
  fetchedAt?: string;
  strength?: NormalizedStrengthScores;
  strengthHistory?: StrengthHistoryPoint[];
  allTime: AllTimeStats;
  weeklyVolume: WeeklyVolume[];
};

export type PersonalTrendBadge = {
  label: string;
  value: string;
  tone: "positive" | "negative" | "neutral";
};

export type RankedCategoryEntry<T extends DashboardMetricMember> = T & {
  rank: number;
  leaderboardValue: number;
  leaderboardDisplay: string;
  leaderboardSuffix: string;
  previousRank: number;
  rankMovement: number;
  rankMovementLabel: string;
  rankMovementTone: "up" | "down" | "same" | "new";
  trendBadges: PersonalTrendBadge[];
};

export function normalizeStrengthScores(scores: StrengthScoreInput[]): NormalizedStrengthScores {
  const normalized: NormalizedStrengthScores = {};
  for (const score of scores) {
    const value = typeof score.score === "number" ? score.score : undefined;
    if (value === undefined) continue;

    const region = (score.strengthBodyRegion || score.bodyRegionDisplay || "overall").trim().toLowerCase();
    if (!region) normalized.overall = value;
    else if (region.includes("upper")) normalized.upper = value;
    else if (region.includes("lower")) normalized.lower = value;
    else if (region.includes("core")) normalized.core = value;
    else if (region.includes("overall")) normalized.overall = value;
  }
  return normalized;
}

export function normalizeStrengthHistory(entries: StrengthHistoryInput[]): StrengthHistoryPoint[] {
  return entries
    .filter((entry): entry is StrengthHistoryInput & { activityTime: string } =>
      Boolean(entry.activityTime && !Number.isNaN(new Date(entry.activityTime).getTime()))
    )
    .map((entry) => ({
      activityTime: entry.activityTime,
      overall: finiteNumber(entry.overall),
      upper: finiteNumber(entry.upper),
      lower: finiteNumber(entry.lower),
      core: finiteNumber(entry.core)
    }))
    .filter((entry) =>
      entry.overall !== undefined || entry.upper !== undefined || entry.lower !== undefined || entry.core !== undefined
    )
    .sort((a, b) => new Date(a.activityTime).getTime() - new Date(b.activityTime).getTime());
}

export function topReadyMuscles(readiness: Record<string, number>, count = 4): [string, number][] {
  return Object.entries(readiness)
    .filter(([, value]) => typeof value === "number" && Number.isFinite(value))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, count);
}

export function groupActivitiesByWeek(activities: ActivityInput[]): WeeklyVolume[] {
  const byWeek = new Map<string, WeeklyVolume>();
  for (const activity of activities) {
    if (!activity.activityTime) continue;
    const date = new Date(activity.activityTime);
    if (Number.isNaN(date.getTime())) continue;
    const week = isoWeekKey(date);
    const existing = byWeek.get(week) ?? { week, workouts: 0, volume: 0 };
    existing.workouts += 1;
    existing.volume += Math.round(activity.workoutPreview?.totalVolume ?? 0);
    byWeek.set(week, existing);
  }

  return [...byWeek.values()].sort((a, b) => a.week.localeCompare(b.week));
}

export function summarizeAllTimeStats(workouts: WorkoutActivityInput[]): AllTimeStats {
  const datedWorkouts = workouts
    .filter((workout) => workout.beginTime && !Number.isNaN(new Date(workout.beginTime).getTime()))
    .sort((a, b) => new Date(a.beginTime ?? 0).getTime() - new Date(b.beginTime ?? 0).getTime());

  return {
    totalVolume: workouts.reduce((sum, workout) => sum + Math.round(workout.totalVolume ?? 0), 0),
    totalWorkouts: workouts.length,
    totalReps: workouts.reduce((sum, workout) => sum + Math.round(workout.totalReps ?? 0), 0),
    totalDuration: workouts.reduce((sum, workout) => sum + Math.round(workout.totalDuration ?? workout.activeDuration ?? 0), 0),
    firstWorkoutAt: datedWorkouts[0]?.beginTime ?? undefined,
    lastWorkoutAt: datedWorkouts.at(-1)?.beginTime ?? undefined
  };
}

export function rankMembersByAllTimeVolume<T extends { member: { id: string; name: string }; allTime: { totalVolume: number } }>(
  members: T[]
): LeaderboardEntry<T>[] {
  return [...members]
    .sort((a, b) => b.allTime.totalVolume - a.allTime.totalVolume || a.member.name.localeCompare(b.member.name))
    .map((member, index) => ({ ...member, rank: index + 1 }));
}

export function rankMembersForCategory<T extends DashboardMetricMember>(
  members: T[],
  category: LeaderboardCategoryId,
  now = new Date()
): RankedCategoryEntry<T>[] {
  const current = rankByValue(members, (member) => categoryValue(member, category, now, "current"));
  const previous = rankByValue(members, (member) => categoryValue(member, category, now, "previous"));
  const previousByMember = new Map(previous.map((entry) => [entry.member.member.id, entry]));

  return current.map((entry) => {
    const previousEntry = previousByMember.get(entry.member.member.id);
    const previousRank = previousEntry?.rank ?? entry.rank;
    const previousValue = previousEntry?.leaderboardValue ?? 0;
    const rankMovement = previousRank - entry.rank;
    const movement = rankMovementLabel(rankMovement, entry.leaderboardValue, previousValue);

    return {
      ...entry.member,
      rank: entry.rank,
      leaderboardValue: entry.leaderboardValue,
      leaderboardDisplay: formatNumber(entry.leaderboardValue),
      leaderboardSuffix: categorySuffix(category),
      previousRank,
      rankMovement,
      rankMovementLabel: movement.label,
      rankMovementTone: movement.tone,
      trendBadges: getPersonalTrendBadges(entry.member, now)
    };
  });
}

export function getPersonalTrendBadges(member: DashboardMetricMember, now = new Date()): PersonalTrendBadge[] {
  const currentWeek = isoWeekKey(now);
  const priorWeek = offsetIsoWeekKey(currentWeek, -1);
  const current = weeklyStats(member, currentWeek);
  const prior = weeklyStats(member, priorWeek);
  const weekDelta = current.volume - prior.volume;
  const weekTrend = prior.volume > 0
    ? `${signedNumber(Math.round((weekDelta / prior.volume) * 100))}% vs prior week`
    : current.volume > 0
      ? "New this week"
      : "No weekly volume";
  const strengthDelta = overallStrengthDelta(member);

  return [
    { label: "This week", value: `${formatNumber(current.volume)} lb`, tone: current.volume > 0 ? "positive" : "neutral" },
    { label: "Week trend", value: weekTrend, tone: weekDelta > 0 ? "positive" : weekDelta < 0 ? "negative" : "neutral" },
    { label: "Streak", value: streakLabel(trainingWeekStreak(member, currentWeek)), tone: current.volume > 0 ? "positive" : "neutral" },
    {
      label: "Strength",
      value: strengthDelta === undefined ? "No strength trend" : `${signedNumber(strengthDelta)} strength`,
      tone: strengthDelta === undefined ? "neutral" : strengthDelta >= 0 ? "positive" : "negative"
    }
  ];
}

export function latestDashboardTimestamp<T extends { fetchedAt?: string }>(members: T[]): Date | undefined {
  let latest: Date | undefined;
  for (const member of members) {
    if (!member.fetchedAt) continue;
    const date = new Date(member.fetchedAt);
    if (Number.isNaN(date.getTime())) continue;
    if (!latest || date.getTime() > latest.getTime()) latest = date;
  }
  return latest;
}

type RankedValue<T extends DashboardMetricMember> = {
  member: T;
  rank: number;
  leaderboardValue: number;
};

function rankByValue<T extends DashboardMetricMember>(members: T[], getValue: (member: T) => number): RankedValue<T>[] {
  return members
    .map((member) => ({ member, leaderboardValue: Math.max(0, Math.round(getValue(member))) }))
    .sort((a, b) => b.leaderboardValue - a.leaderboardValue || a.member.member.name.localeCompare(b.member.member.name))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

function categoryValue(member: DashboardMetricMember, category: LeaderboardCategoryId, now: Date, period: "current" | "previous"): number {
  switch (category) {
    case "allTimeVolume": {
      const currentWeekVolume = weeklyStats(member, isoWeekKey(now)).volume;
      return period === "current" ? member.allTime.totalVolume : Math.max(0, member.allTime.totalVolume - currentWeekVolume);
    }
    case "thisMonthVolume":
      return monthlyVolume(member, now, period === "current" ? 0 : -1);
    case "thisWeekVolume":
      return weeklyStats(member, isoWeekKey(offsetDateByWeeks(now, period === "current" ? 0 : -1))).volume;
    case "workouts": {
      const currentWeekWorkouts = weeklyStats(member, isoWeekKey(now)).workouts;
      return period === "current" ? member.allTime.totalWorkouts : Math.max(0, member.allTime.totalWorkouts - currentWeekWorkouts);
    }
    case "fairnessAdjusted": {
      const scoringWeek = isoWeekKey(offsetDateByWeeks(now, period === "current" ? 0 : -1));
      return fairnessAdjustedScore(member, scoringWeek);
    }
  }
}

function categorySuffix(category: LeaderboardCategoryId): string {
  switch (category) {
    case "allTimeVolume":
      return "lb all-time";
    case "thisMonthVolume":
      return "lb this month";
    case "thisWeekVolume":
      return "lb this week";
    case "workouts":
      return "workouts";
    case "fairnessAdjusted":
      return "fairness pts";
  }
}

function rankMovementLabel(
  movement: number,
  currentValue: number,
  previousValue: number
): { label: string; tone: RankedCategoryEntry<DashboardMetricMember>["rankMovementTone"] } {
  if (currentValue > 0 && previousValue <= 0) return { label: "New", tone: "new" };
  if (movement > 0) return { label: `↑ ${movement}`, tone: "up" };
  if (movement < 0) return { label: `↓ ${Math.abs(movement)}`, tone: "down" };
  return { label: "—", tone: "same" };
}

function weeklyStats(member: DashboardMetricMember, week: string): WeeklyVolume {
  return member.weeklyVolume.find((entry) => entry.week === week) ?? { week, workouts: 0, volume: 0 };
}

function monthlyVolume(member: DashboardMetricMember, now: Date, monthOffset: number): number {
  const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthOffset, 1));
  const year = target.getUTCFullYear();
  const month = target.getUTCMonth();
  return member.weeklyVolume.reduce((sum, week) => {
    const weekStart = isoWeekStartDate(week.week);
    if (!weekStart) return sum;
    return weekStart.getUTCFullYear() === year && weekStart.getUTCMonth() === month ? sum + Math.round(week.volume) : sum;
  }, 0);
}

function fairnessAdjustedScore(member: DashboardMetricMember, week: string): number {
  const current = weeklyStats(member, week);
  const prior = weeklyStats(member, offsetIsoWeekKey(week, -1));
  const averageWorkoutVolume = member.allTime.totalWorkouts > 0 ? member.allTime.totalVolume / member.allTime.totalWorkouts : 0;
  const normalizedEffort = averageWorkoutVolume > 0 ? (current.volume / averageWorkoutVolume) * 1000 : current.volume / 10;
  const improvementRatio = prior.volume > 0 ? (current.volume - prior.volume) / prior.volume : current.volume > 0 ? 1 : 0;
  const improvementBonus = Math.max(0, Math.min(3, improvementRatio)) * 500;
  const workoutBonus = current.workouts * 300;
  const streakBonus = trainingWeekStreak(member, week) * 150;
  const strengthBonus = Math.max(0, overallStrengthDelta(member) ?? 0) * 10;
  return Math.max(0, Math.round(normalizedEffort + improvementBonus + workoutBonus + streakBonus + strengthBonus));
}

function trainingWeekStreak(member: DashboardMetricMember, endingWeek: string): number {
  let streak = 0;
  let week = endingWeek;
  while (weeklyStats(member, week).volume > 0 || weeklyStats(member, week).workouts > 0) {
    streak += 1;
    week = offsetIsoWeekKey(week, -1);
  }
  return streak;
}

function streakLabel(streak: number): string {
  if (streak <= 0) return "No active streak";
  if (streak === 1) return "1-week streak";
  return `${streak}-week streak`;
}

function overallStrengthDelta(member: DashboardMetricMember): number | undefined {
  const points = [...(member.strengthHistory ?? [])]
    .filter((entry) => typeof entry.overall === "number" && Number.isFinite(entry.overall))
    .sort((a, b) => new Date(a.activityTime).getTime() - new Date(b.activityTime).getTime());
  if (points.length >= 2) return Math.round((points.at(-1)!.overall ?? 0) - (points[0].overall ?? 0));
  return undefined;
}

function signedNumber(value: number): string {
  return value > 0 ? `+${formatNumber(value)}` : formatNumber(value);
}

function offsetDateByWeeks(date: Date, weeks: number): Date {
  const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  copy.setUTCDate(copy.getUTCDate() + weeks * 7);
  return copy;
}

function offsetIsoWeekKey(week: string, offset: number): string {
  const date = isoWeekStartDate(week) ?? new Date();
  date.setUTCDate(date.getUTCDate() + offset * 7);
  return isoWeekKey(date);
}

function isoWeekStartDate(weekKey: string): Date | undefined {
  const match = /^(\d{4})-W(\d{2})$/.exec(weekKey);
  if (!match) return undefined;
  const year = Number(match[1]);
  const week = Number(match[2]);
  if (!Number.isInteger(year) || !Number.isInteger(week) || week < 1 || week > 53) return undefined;
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() + 1 - jan4Day + (week - 1) * 7);
  return monday;
}

export function isoWeekKey(input: Date): string {
  const date = new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function finiteNumber(value?: number | null): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : undefined;
}

export function formatDuration(seconds?: number | null): string {
  if (!seconds || seconds < 0) return "—";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export function formatNumber(value?: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}
