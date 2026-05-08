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

export type TrainingCalendarInput = {
  activityTime?: string | null;
  beginTime?: string | null;
  totalVolume?: number | null;
  totalReps?: number | null;
  totalDuration?: number | null;
  activeDuration?: number | null;
  workoutPreview?: {
    totalVolume?: number | null;
    totalReps?: number | null;
    totalDuration?: number | null;
  } | null;
};

export type TrainingCalendarDay = {
  date: string;
  workouts: number;
  volume: number;
  reps: number;
  duration: number;
  intensity: number;
};

export type DetailActivityInput = TrainingCalendarInput & {
  activityId?: string | null;
  activityType?: string | null;
  workoutPreview?: TrainingCalendarInput["workoutPreview"] & {
    workoutTitle?: string | null;
    targetArea?: string | null;
  };
};

export type DetailSetInput = {
  repCount?: number | null;
  weight?: number | null;
  avgMaxWeight?: number | null;
  oneRepMax?: number | null;
  maxConPower?: number | null;
  totalVolume?: number | null;
  duration?: number | null;
};

export type DetailMovementInput = {
  movementName?: string | null;
  totalVolume?: number | null;
  totalWork?: number | null;
  sets?: DetailSetInput[] | null;
};

export type DetailWorkoutInput = {
  activityId?: string | null;
  name?: string | null;
  targetArea?: string | null;
  duration?: number | null;
  timeUnderTension?: number | null;
  totalReps?: number | null;
  totalSets?: number | null;
  totalVolume?: number | null;
  totalWork?: number | null;
  movementSets?: DetailMovementInput[] | null;
};

export type PersonalRecordInsight = {
  label: string;
  value: number;
  unit: string;
  movementName?: string;
  workoutName?: string;
  date?: string;
};

export type FavoriteMovementInsight = {
  name: string;
  volume: number;
  sets: number;
  reps: number;
  frequency: number;
};

export type BodyBalanceArea = "Upper" | "Lower" | "Core" | "Full Body" | "Other";

export type BodyBalanceInsight = {
  area: BodyBalanceArea;
  workouts: number;
  volume: number;
  percentage: number;
};

export type TrainingStyleInsight = {
  label: string;
  traits: string[];
};

export type RecentWorkoutHighlight = {
  title: string;
  date?: string;
  volume?: number;
  reps?: number;
  duration?: number;
  density?: number;
};

export type MemberDetailInsights = {
  calendar: {
    days: TrainingCalendarDay[];
    activeDays: number;
    activeStreak: number;
    longestStreak: number;
    maxVolume: number;
    totalVolume: number;
  };
  records: {
    heaviestSet?: PersonalRecordInsight;
    bestOneRepMax?: PersonalRecordInsight;
    mostRepsWorkout?: PersonalRecordInsight;
    highestVolumeWorkout?: PersonalRecordInsight;
    peakPower?: PersonalRecordInsight;
  };
  favoriteMovements: FavoriteMovementInsight[];
  bodyBalance: BodyBalanceInsight[];
  trainingStyle: TrainingStyleInsight;
  recentHighlights: {
    bestVolumeWorkout?: RecentWorkoutHighlight;
    densityWorkout?: RecentWorkoutHighlight;
    standoutRecord?: PersonalRecordInsight;
  };
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
  calendarDays?: TrainingCalendarDay[];
  activities?: DetailActivityInput[];
  recentWorkoutDetails?: DetailWorkoutInput[];
  errors?: string[];
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

export function summarizeCalendarDays(entries: TrainingCalendarInput[]): TrainingCalendarDay[] {
  const byDate = new Map<string, Omit<TrainingCalendarDay, "intensity">>();

  for (const entry of entries) {
    const date = dateKey(entry.beginTime ?? entry.activityTime);
    if (!date) continue;

    const existing = byDate.get(date) ?? { date, workouts: 0, volume: 0, reps: 0, duration: 0 };
    existing.workouts += 1;
    existing.volume += metricNumber(entry.totalVolume ?? entry.workoutPreview?.totalVolume);
    existing.reps += metricNumber(entry.totalReps ?? entry.workoutPreview?.totalReps);
    existing.duration += metricNumber(entry.totalDuration ?? entry.activeDuration ?? entry.workoutPreview?.totalDuration);
    byDate.set(date, existing);
  }

  return finalizeCalendarDays([...byDate.values()]);
}

export function getMemberDetailInsights(member: DashboardMetricMember): MemberDetailInsights {
  const days = normalizeCalendarDays(member.calendarDays?.length ? member.calendarDays : summarizeCalendarDays(member.activities ?? []));
  const calendar = summarizeTrainingCalendar(days);
  const workouts = collectWorkoutSummaries(member.activities ?? [], member.recentWorkoutDetails ?? []);
  const records = derivePersonalRecords(workouts);
  const favoriteMovements = deriveFavoriteMovements(member.recentWorkoutDetails ?? []);
  const bodyBalance = deriveBodyBalance(workouts);

  return {
    calendar,
    records,
    favoriteMovements,
    bodyBalance,
    trainingStyle: deriveTrainingStyle(member, calendar, bodyBalance),
    recentHighlights: deriveRecentHighlights(workouts, records)
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

type WorkoutInsightSource = {
  key: string;
  title: string;
  date?: string;
  targetArea?: string;
  volume?: number;
  reps?: number;
  duration?: number;
  tension?: number;
  detail?: DetailWorkoutInput;
};

type MutableFavoriteMovement = Omit<FavoriteMovementInsight, "frequency"> & {
  workouts: Set<string>;
};

const BODY_BALANCE_ORDER: BodyBalanceArea[] = ["Upper", "Lower", "Core", "Full Body", "Other"];

function normalizeCalendarDays(days: TrainingCalendarDay[]): TrainingCalendarDay[] {
  const byDate = new Map<string, Omit<TrainingCalendarDay, "intensity">>();

  for (const day of days) {
    if (!isDateKey(day.date)) continue;
    const existing = byDate.get(day.date) ?? { date: day.date, workouts: 0, volume: 0, reps: 0, duration: 0 };
    existing.workouts += metricNumber(day.workouts);
    existing.volume += metricNumber(day.volume);
    existing.reps += metricNumber(day.reps);
    existing.duration += metricNumber(day.duration);
    byDate.set(day.date, existing);
  }

  return finalizeCalendarDays([...byDate.values()]);
}

function finalizeCalendarDays(days: Omit<TrainingCalendarDay, "intensity">[]): TrainingCalendarDay[] {
  const maxVolume = Math.max(0, ...days.map((day) => day.volume));
  return days
    .map((day) => ({
      ...day,
      workouts: Math.max(0, Math.round(day.workouts)),
      volume: Math.max(0, Math.round(day.volume)),
      reps: Math.max(0, Math.round(day.reps)),
      duration: Math.max(0, Math.round(day.duration)),
      intensity: calendarIntensity(day.workouts, day.volume, maxVolume)
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function summarizeTrainingCalendar(days: TrainingCalendarDay[]): MemberDetailInsights["calendar"] {
  const activeDays = days.filter((day) => day.workouts > 0).length;
  const maxVolume = Math.max(0, ...days.map((day) => day.volume));
  const totalVolume = days.reduce((sum, day) => sum + day.volume, 0);
  let longestStreak = 0;
  let currentChain = 0;
  let previousDate: string | undefined;

  for (const day of days.filter((entry) => entry.workouts > 0)) {
    currentChain = previousDate && daysBetween(previousDate, day.date) === 1 ? currentChain + 1 : 1;
    longestStreak = Math.max(longestStreak, currentChain);
    previousDate = day.date;
  }

  return {
    days,
    activeDays,
    activeStreak: currentChain,
    longestStreak,
    maxVolume,
    totalVolume
  };
}

function collectWorkoutSummaries(
  activities: DetailActivityInput[],
  details: DetailWorkoutInput[]
): WorkoutInsightSource[] {
  const workouts = new Map<string, WorkoutInsightSource>();

  activities.forEach((activity, index) => {
    const key = activity.activityId ?? activity.activityTime ?? `activity-${index}`;
    const preview = activity.workoutPreview;
    workouts.set(key, {
      key,
      title: preview?.workoutTitle ?? activity.activityType ?? "Workout",
      date: activity.activityTime ?? undefined,
      targetArea: preview?.targetArea ?? activity.activityType ?? undefined,
      volume: finiteNumber(activity.totalVolume ?? preview?.totalVolume),
      reps: finiteNumber(activity.totalReps ?? preview?.totalReps),
      duration: finiteNumber(activity.totalDuration ?? activity.activeDuration ?? preview?.totalDuration)
    });
  });

  details.forEach((detail, index) => {
    const key = detail.activityId ?? detail.name ?? `detail-${index}`;
    const existing = workouts.get(key);
    workouts.set(key, {
      key,
      title: detail.name ?? existing?.title ?? "Workout",
      date: existing?.date,
      targetArea: detail.targetArea ?? existing?.targetArea,
      volume: finiteNumber(detail.totalVolume) ?? existing?.volume,
      reps: finiteNumber(detail.totalReps) ?? existing?.reps,
      duration: finiteNumber(detail.duration) ?? existing?.duration,
      tension: finiteNumber(detail.timeUnderTension) ?? existing?.tension,
      detail
    });
  });

  return [...workouts.values()].sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime());
}

function derivePersonalRecords(workouts: WorkoutInsightSource[]): MemberDetailInsights["records"] {
  const records: MemberDetailInsights["records"] = {};

  for (const workout of workouts) {
    if (workout.reps && workout.reps > 0) {
      records.mostRepsWorkout = betterRecord(records.mostRepsWorkout, {
        label: "Most reps in one workout",
        value: workout.reps,
        unit: "reps",
        workoutName: workout.title,
        date: workout.date
      });
    }

    if (workout.volume && workout.volume > 0) {
      records.highestVolumeWorkout = betterRecord(records.highestVolumeWorkout, {
        label: "Highest volume workout",
        value: workout.volume,
        unit: "lb",
        workoutName: workout.title,
        date: workout.date
      });
    }

    for (const movement of workout.detail?.movementSets ?? []) {
      const movementName = cleanLabel(movement.movementName) ?? "Movement";
      for (const set of movement.sets ?? []) {
        const weight = finiteNumber(set.weight ?? set.avgMaxWeight);
        if (weight && weight > 0) {
          records.heaviestSet = betterRecord(records.heaviestSet, {
            label: "Heaviest set",
            value: weight,
            unit: "lb",
            movementName,
            workoutName: workout.title,
            date: workout.date
          });
        }

        const oneRepMax = finiteNumber(set.oneRepMax);
        if (oneRepMax && oneRepMax > 0) {
          records.bestOneRepMax = betterRecord(records.bestOneRepMax, {
            label: "Best estimated 1RM",
            value: oneRepMax,
            unit: "lb",
            movementName,
            workoutName: workout.title,
            date: workout.date
          });
        }

        const power = finiteNumber(set.maxConPower);
        if (power && power > 0) {
          records.peakPower = betterRecord(records.peakPower, {
            label: "Peak power",
            value: power,
            unit: "W",
            movementName,
            workoutName: workout.title,
            date: workout.date
          });
        }
      }
    }
  }

  return records;
}

function deriveFavoriteMovements(details: DetailWorkoutInput[]): FavoriteMovementInsight[] {
  const byName = new Map<string, MutableFavoriteMovement>();

  details.forEach((detail, detailIndex) => {
    const workoutKey = detail.activityId ?? detail.name ?? `detail-${detailIndex}`;
    for (const movement of detail.movementSets ?? []) {
      const name = cleanLabel(movement.movementName);
      if (!name) continue;
      const existing = byName.get(name) ?? { name, volume: 0, sets: 0, reps: 0, workouts: new Set<string>() };
      const sets = movement.sets ?? [];
      existing.volume += finiteNumber(movement.totalVolume) ?? sets.reduce((sum, set) => sum + metricNumber(set.totalVolume), 0);
      existing.sets += sets.length;
      existing.reps += sets.reduce((sum, set) => sum + metricNumber(set.repCount), 0);
      existing.workouts.add(workoutKey);
      byName.set(name, existing);
    }
  });

  return [...byName.values()]
    .map((movement) => ({
      name: movement.name,
      volume: Math.round(movement.volume),
      sets: movement.sets,
      reps: movement.reps,
      frequency: movement.workouts.size
    }))
    .sort((a, b) => b.volume - a.volume || b.frequency - a.frequency || b.reps - a.reps || a.name.localeCompare(b.name))
    .slice(0, 6);
}

function deriveBodyBalance(workouts: WorkoutInsightSource[]): BodyBalanceInsight[] {
  const byArea = new Map<BodyBalanceArea, { workouts: number; volume: number }>(
    BODY_BALANCE_ORDER.map((area) => [area, { workouts: 0, volume: 0 }])
  );

  for (const workout of workouts) {
    const area = classifyBodyArea(workout.targetArea ?? workout.title);
    const existing = byArea.get(area) ?? { workouts: 0, volume: 0 };
    existing.workouts += 1;
    existing.volume += metricNumber(workout.volume);
    byArea.set(area, existing);
  }

  const totalVolume = [...byArea.values()].reduce((sum, entry) => sum + entry.volume, 0);
  const totalWorkouts = [...byArea.values()].reduce((sum, entry) => sum + entry.workouts, 0);

  return BODY_BALANCE_ORDER.map((area) => {
    const entry = byArea.get(area) ?? { workouts: 0, volume: 0 };
    return {
      area,
      workouts: entry.workouts,
      volume: Math.round(entry.volume),
      percentage: totalVolume > 0
        ? Math.round((entry.volume / totalVolume) * 100)
        : totalWorkouts > 0
          ? Math.round((entry.workouts / totalWorkouts) * 100)
          : 0
    };
  });
}

function deriveTrainingStyle(
  member: DashboardMetricMember,
  calendar: MemberDetailInsights["calendar"],
  bodyBalance: BodyBalanceInsight[]
): TrainingStyleInsight {
  const strengthDelta = overallStrengthDelta(member);
  const averageVolume = member.allTime.totalWorkouts > 0 ? Math.round(member.allTime.totalVolume / member.allTime.totalWorkouts) : 0;
  const recentAverageVolume = calendar.activeDays > 0 ? Math.round(calendar.totalVolume / calendar.activeDays) : 0;
  const topArea = [...bodyBalance].sort((a, b) => b.percentage - a.percentage || b.volume - a.volume)[0];
  const weekendShare = activeWeekendShare(calendar.days);
  const traits = [
    strengthDelta === undefined ? undefined : `${signedNumber(strengthDelta)} strength score`,
    calendar.activeStreak > 0 ? `${calendar.activeStreak}-day active streak` : undefined,
    topArea && topArea.percentage > 0 ? `${topArea.area} focus (${topArea.percentage}%)` : undefined,
    averageVolume > 0 ? `${formatNumber(averageVolume)} lb/workout avg` : undefined
  ].filter((trait): trait is string => Boolean(trait));

  let label = "Balanced builder";
  if (topArea?.area === "Core" && topArea.percentage >= 45) label = "Core specialist";
  else if (strengthDelta !== undefined && strengthDelta >= 20) label = "Strength-score climber";
  else if (calendar.activeStreak >= 5 || calendar.activeDays >= 10) label = "Consistency monster";
  else if (averageVolume >= 5000 || recentAverageVolume >= 5000) label = "High-volume grinder";
  else if (weekendShare >= 0.6 && calendar.activeDays >= 3) label = "Weekend warrior";

  return { label, traits: traits.length ? traits : ["More workout detail will sharpen this profile."] };
}

function deriveRecentHighlights(
  workouts: WorkoutInsightSource[],
  records: MemberDetailInsights["records"]
): MemberDetailInsights["recentHighlights"] {
  const bestVolumeWorkout = [...workouts]
    .filter((workout) => (workout.volume ?? 0) > 0)
    .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))[0];
  const densityWorkout = workouts
    .map((workout) => ({ workout, density: workoutDensity(workout) }))
    .filter((entry): entry is { workout: WorkoutInsightSource; density: number } => typeof entry.density === "number")
    .sort((a, b) => b.density - a.density)[0];

  return {
    bestVolumeWorkout: bestVolumeWorkout ? workoutHighlight(bestVolumeWorkout) : undefined,
    densityWorkout: densityWorkout ? workoutHighlight(densityWorkout.workout, densityWorkout.density) : undefined,
    standoutRecord: records.peakPower ?? records.bestOneRepMax ?? records.heaviestSet ?? records.highestVolumeWorkout
  };
}

function betterRecord(current: PersonalRecordInsight | undefined, candidate: PersonalRecordInsight): PersonalRecordInsight {
  return !current || candidate.value > current.value ? candidate : current;
}

function workoutDensity(workout: WorkoutInsightSource): number | undefined {
  const volume = workout.volume ?? 0;
  const seconds = workout.tension && workout.tension > 0 ? workout.tension : workout.duration;
  if (!volume || !seconds || seconds <= 0) return undefined;
  return Math.round(volume / (seconds / 60));
}

function workoutHighlight(workout: WorkoutInsightSource, density = workoutDensity(workout)): RecentWorkoutHighlight {
  return {
    title: workout.title,
    date: workout.date,
    volume: workout.volume,
    reps: workout.reps,
    duration: workout.duration,
    density
  };
}

function classifyBodyArea(value?: string | null): BodyBalanceArea {
  const label = (value ?? "").toLowerCase();
  if (label.includes("full") || label.includes("total body")) return "Full Body";
  if (label.includes("core") || label.includes("ab") || label.includes("oblique")) return "Core";
  if (label.includes("lower") || label.includes("leg") || label.includes("glute") || label.includes("quad") || label.includes("hamstring") || label.includes("calf")) return "Lower";
  if (label.includes("upper") || label.includes("chest") || label.includes("back") || label.includes("shoulder") || label.includes("arm") || label.includes("bicep") || label.includes("tricep")) return "Upper";
  return "Other";
}

function activeWeekendShare(days: TrainingCalendarDay[]): number {
  const activeDays = days.filter((day) => day.workouts > 0);
  if (!activeDays.length) return 0;
  const weekendDays = activeDays.filter((day) => {
    const date = parseDateKey(day.date);
    const weekday = date?.getUTCDay();
    return weekday === 0 || weekday === 6;
  }).length;
  return weekendDays / activeDays.length;
}

function calendarIntensity(workouts: number, volume: number, maxVolume: number): number {
  if (workouts <= 0) return 0;
  if (maxVolume <= 0 || volume <= 0) return 1;
  const ratio = volume / maxVolume;
  if (ratio > 0.75) return 4;
  if (ratio > 0.5) return 3;
  if (ratio > 0.25) return 2;
  return 1;
}

function dateKey(value?: string | null): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(0, 10);
}

function isDateKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Boolean(parseDateKey(value));
}

function parseDateKey(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function daysBetween(start: string, end: string): number | undefined {
  const startDate = parseDateKey(start);
  const endDate = parseDateKey(end);
  if (!startDate || !endDate) return undefined;
  return Math.round((endDate.getTime() - startDate.getTime()) / 86400000);
}

function metricNumber(value?: number | null): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : 0;
}

function cleanLabel(value?: string | null): string | undefined {
  const label = value?.trim();
  return label || undefined;
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
    .map((entry, index) => {
      const time = timestamp(entry.activityTime);
      const value = positiveFiniteNumber(entry.overall);
      return time === undefined || value === undefined ? undefined : { order: index, time, value };
    })
    .filter((entry): entry is { order: number; time: number; value: number } => Boolean(entry));
  const current = positiveFiniteNumber(member.strength?.overall);
  if (current !== undefined) {
    const latestHistoryTime = Math.max(0, ...points.map((point) => point.time));
    points.push({
      order: Number.MAX_SAFE_INTEGER,
      time: timestamp(member.fetchedAt) ?? latestHistoryTime + 1,
      value: current
    });
  }

  points.sort((a, b) => a.time - b.time || a.order - b.order);
  if (points.length >= 2) return Math.round(points.at(-1)!.value - points[0].value);
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

function positiveFiniteNumber(value?: number | null): number | undefined {
  const number = finiteNumber(value);
  return number !== undefined && number > 0 ? number : undefined;
}

function timestamp(value?: string | null): number | undefined {
  if (!value) return undefined;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : undefined;
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
