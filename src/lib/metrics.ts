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

export function isoWeekKey(input: Date): string {
  const date = new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
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
