import { TonalMember } from "./members";
import { AllTimeStats, groupActivitiesByWeek, normalizeStrengthScores, summarizeAllTimeStats, topReadyMuscles } from "./metrics";

const AUTH0_CLIENT_ID = "ERCyexW-xoVG_Yy3RDe-eV4xsOnRHP6L";
const AUTH0_TOKEN_URL = "https://tonal.auth0.com/oauth/token";
const TONAL_API_BASE = "https://api.tonal.com";
const RECENT_WORKOUT_DETAIL_LIMIT = 5;

type TokenBundle = {
  id_token: string;
  refresh_token?: string;
  access_token?: string;
  expires_in?: number;
};

export type TonalDashboard = {
  member: { id: string; name: string };
  fetchedAt: string;
  profile?: Record<string, unknown>;
  strength: ReturnType<typeof normalizeStrengthScores>;
  readiness: Record<string, number>;
  topReady: [string, number][];
  allTime: AllTimeStats;
  activities: TonalActivity[];
  recentWorkoutDetails: TonalWorkoutDetail[];
  weeklyVolume: ReturnType<typeof groupActivitiesByWeek>;
  errors: string[];
};

export type TonalActivity = {
  activityId?: string;
  activityTime?: string;
  activityType?: string;
  workoutPreview?: {
    workoutTitle?: string;
    programName?: string;
    coachName?: string;
    targetArea?: string;
    totalDuration?: number;
    totalVolume?: number;
    totalWork?: number;
    totalAchievements?: number;
  };
};

export type TonalWorkoutActivity = {
  id?: string;
  workoutActivityID?: string;
  workoutId?: string;
  workoutTitle?: string;
  workoutType?: string;
  beginTime?: string;
  endTime?: string;
  targetArea?: string;
  totalDuration?: number;
  activeDuration?: number;
  totalVolume?: number;
  totalReps?: number;
  totalWork?: number;
};

export type TonalWorkoutDetail = {
  activityId: string;
  name?: string;
  coachName?: string | null;
  targetArea?: string | null;
  duration?: number;
  timeUnderTension?: number;
  totalReps?: number;
  totalSets?: number;
  totalVolume?: number;
  totalWork?: number;
  workoutType?: string;
  level?: string;
  movementSets: TonalMovementSummary[];
};

export type TonalMovementSummary = {
  movementName?: string;
  totalVolume?: number;
  totalWork?: number;
  sets?: TonalMovementSetSummary[];
};

export type TonalMovementSetSummary = {
  repCount?: number;
  repGoal?: number;
  weight?: number;
  avgMaxWeight?: number;
  oneRepMax?: number;
  maxConPower?: number;
  totalVolume?: number;
  totalWork?: number;
  warmUp?: boolean;
  weightPercentage?: number;
  suggestedWeightChange?: number;
  spotterMode?: string;
  duration?: number;
  burnout?: boolean;
  dropSet?: boolean;
};

type TonalFormattedWorkoutSummary = Omit<TonalWorkoutDetail, "activityId" | "totalSets" | "movementSets"> & {
  id?: string;
  movementSets?: TonalMovementSummary[];
};

type UserInfo = { id?: string; sub?: string; userId?: string };

const tokenCache = new Map<string, { token: string; expiresAt: number; refreshToken?: string }>();

export async function getFamilyDashboard(member: TonalMember): Promise<TonalDashboard> {
  const client = await TonalClient.forMember(member);
  const errors: string[] = [];

  const userInfo = await client.get<UserInfo>("/v6/users/userinfo");
  const userId = userInfo.id ?? userInfo.userId ?? userInfo.sub;
  if (!userId) throw new Error("Tonal userinfo response did not include a user id.");

  const [profile, strengthRaw, readinessRaw, activitiesRaw, workoutActivitiesRaw] = await Promise.all([
    client.get<Record<string, unknown>>(`/v6/users/${userId}`).catch((error) => noteError(errors, "profile", error)),
    client.get<unknown[]>(`/v6/users/${userId}/strength-scores/current`).catch((error) => noteError(errors, "strength", error)),
    client.get<Record<string, number>>(`/v6/users/${userId}/muscle-readiness/current`).catch((error) => noteError(errors, "readiness", error)),
    client.get<TonalActivity[]>(`/v6/users/${userId}/activities?limit=20`).catch((error) => noteError(errors, "activities", error)),
    client.getPaginated<TonalWorkoutActivity>(`/v6/users/${userId}/workout-activities`).catch((error) =>
      noteError(errors, "all-time workouts", error)
    )
  ]);

  const activities = Array.isArray(activitiesRaw) ? activitiesRaw : [];
  const workoutActivities = Array.isArray(workoutActivitiesRaw) ? workoutActivitiesRaw : [];
  const workoutActivitySummaries = workoutActivities
    .map(workoutActivityToActivity)
    .sort((a, b) => new Date(b.activityTime ?? 0).getTime() - new Date(a.activityTime ?? 0).getTime());
  const displayActivities = activities.length
    ? [...activities].sort((a, b) => new Date(b.activityTime ?? 0).getTime() - new Date(a.activityTime ?? 0).getTime())
    : workoutActivitySummaries.slice(0, 20);
  const readiness = readinessRaw && !Array.isArray(readinessRaw) ? readinessRaw : {};
  const recentWorkoutDetails = await getRecentWorkoutDetails(client, userId, displayActivities, errors);

  return {
    member: { id: member.id, name: member.name },
    fetchedAt: new Date().toISOString(),
    profile: profile && !Array.isArray(profile) ? profile : undefined,
    strength: normalizeStrengthScores(Array.isArray(strengthRaw) ? (strengthRaw as never[]) : []),
    readiness,
    topReady: topReadyMuscles(readiness),
    allTime: summarizeAllTimeStats(workoutActivities),
    activities: displayActivities,
    recentWorkoutDetails,
    weeklyVolume: groupActivitiesByWeek(workoutActivitySummaries.length ? workoutActivitySummaries : displayActivities),
    errors
  };
}

async function getRecentWorkoutDetails(
  client: TonalClient,
  userId: string,
  activities: TonalActivity[],
  errors: string[]
): Promise<TonalWorkoutDetail[]> {
  const detailRequests = activities
    .filter((activity): activity is TonalActivity & { activityId: string } => Boolean(activity.activityId))
    .slice(0, RECENT_WORKOUT_DETAIL_LIMIT)
    .map(async (activity) => {
      const summary = await client.get<TonalFormattedWorkoutSummary>(
        `/v6/formatted/users/${userId}/workout-summaries/${activity.activityId}`
      );
      return normalizeWorkoutDetail(activity.activityId, summary);
    });

  const settled = await Promise.allSettled(detailRequests);
  const details: TonalWorkoutDetail[] = [];
  for (const result of settled) {
    if (result.status === "fulfilled") details.push(result.value);
    else noteError(errors, "recent workout details", result.reason);
  }
  return details;
}

function normalizeWorkoutDetail(activityId: string, summary: TonalFormattedWorkoutSummary): TonalWorkoutDetail {
  const movementSets = (summary.movementSets ?? []).map((movement) => ({
    movementName: movement.movementName,
    totalVolume: movement.totalVolume,
    totalWork: movement.totalWork,
    sets: movement.sets?.map((set) => ({
      repCount: set.repCount,
      repGoal: set.repGoal,
      weight: set.weight,
      avgMaxWeight: set.avgMaxWeight,
      oneRepMax: set.oneRepMax,
      maxConPower: set.maxConPower,
      totalVolume: set.totalVolume,
      totalWork: set.totalWork,
      warmUp: set.warmUp,
      weightPercentage: set.weightPercentage,
      suggestedWeightChange: set.suggestedWeightChange,
      spotterMode: set.spotterMode,
      duration: set.duration,
      burnout: set.burnout,
      dropSet: set.dropSet
    }))
  }));

  return {
    activityId,
    name: summary.name,
    coachName: summary.coachName,
    targetArea: summary.targetArea,
    duration: summary.duration,
    timeUnderTension: summary.timeUnderTension,
    totalReps: summary.totalReps,
    totalSets: movementSets.reduce((sum, movement) => sum + (movement.sets?.length ?? 0), 0),
    totalVolume: summary.totalVolume,
    totalWork: summary.totalWork,
    workoutType: summary.workoutType,
    level: summary.level,
    movementSets
  };
}

function workoutActivityToActivity(workout: TonalWorkoutActivity): TonalActivity {
  return {
    activityId: workout.id ?? workout.workoutActivityID,
    activityTime: workout.beginTime,
    activityType: workout.workoutType,
    workoutPreview: {
      workoutTitle: workout.workoutTitle ?? workout.workoutType,
      targetArea: workout.targetArea ?? workout.workoutType,
      totalDuration: workout.totalDuration ?? workout.activeDuration,
      totalVolume: workout.totalVolume,
      totalWork: workout.totalWork
    }
  };
}

function noteError(errors: string[], label: string, error: unknown): undefined {
  errors.push(`${label}: ${(error as Error).message}`);
  return undefined;
}

class TonalClient {
  private constructor(
    private readonly member: TonalMember,
    private token: string
  ) {}

  static async forMember(member: TonalMember): Promise<TonalClient> {
    const cached = tokenCache.get(member.id);
    if (cached && cached.expiresAt > Date.now() + 60_000) {
      return new TonalClient(member, cached.token);
    }

    const bundle = member.refreshToken ? await refreshToken(member.refreshToken) : await passwordGrant(member);
    const token = bundle.id_token;
    const expiresAt = Date.now() + Math.max(60, (bundle.expires_in ?? 36000) - 60) * 1000;
    tokenCache.set(member.id, { token, expiresAt, refreshToken: bundle.refresh_token ?? member.refreshToken });
    return new TonalClient(member, token);
  }

  async get<T>(path: string, extraHeaders: Record<string, string> = {}): Promise<T> {
    const response = await this.request(path, extraHeaders);
    return (await response.json()) as T;
  }

  async getPaginated<T>(path: string, limit = 100): Promise<T[]> {
    const items: T[] = [];
    let offset = 0;
    let total: number | undefined;

    while (total === undefined || offset < total) {
      const response = await this.request(path, {
        "pg-offset": String(offset),
        "pg-limit": String(limit)
      });
      const batch = (await response.json()) as T[];
      if (!Array.isArray(batch)) throw new Error(`Expected paginated Tonal response for ${path} to be an array.`);

      items.push(...batch);
      const headerTotal = Number(response.headers.get("pg-total"));
      total = Number.isFinite(headerTotal) && headerTotal >= 0 ? headerTotal : offset + batch.length;
      offset += limit;

      if (batch.length === 0 || batch.length < limit) break;
    }

    return items;
  }

  private async request(path: string, extraHeaders: Record<string, string> = {}, retried = false): Promise<Response> {
    const response = await fetch(`${TONAL_API_BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        ...extraHeaders
      },
      cache: "no-store"
    });

    if (response.status === 401 && !retried) {
      const cached = tokenCache.get(this.member.id);
      const refresh = cached?.refreshToken ?? this.member.refreshToken;
      if (refresh) {
        const bundle = await refreshToken(refresh);
        this.token = bundle.id_token;
        tokenCache.set(this.member.id, {
          token: this.token,
          expiresAt: Date.now() + Math.max(60, (bundle.expires_in ?? 36000) - 60) * 1000,
          refreshToken: bundle.refresh_token ?? refresh
        });
        return this.request(path, extraHeaders, true);
      }
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Tonal API ${response.status} ${response.statusText}${body ? `: ${body.slice(0, 200)}` : ""}`);
    }

    return response;
  }
}

async function passwordGrant(member: TonalMember): Promise<TokenBundle> {
  if (!member.email || !member.password) throw new Error(`Member ${member.id} does not have email+password credentials.`);
  return tokenRequest({
    grant_type: "password",
    username: member.email,
    password: member.password,
    client_id: AUTH0_CLIENT_ID,
    scope: "openid profile email offline_access"
  });
}

export async function refreshToken(refresh_token: string): Promise<TokenBundle> {
  return tokenRequest({
    grant_type: "refresh_token",
    client_id: AUTH0_CLIENT_ID,
    refresh_token
  });
}

async function tokenRequest(payload: Record<string, string>): Promise<TokenBundle> {
  const response = await fetch(AUTH0_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Tonal Auth0 ${response.status} ${response.statusText}${body ? `: ${body.slice(0, 200)}` : ""}`);
  }

  const bundle = (await response.json()) as TokenBundle;
  if (!bundle.id_token) throw new Error("Tonal Auth0 response did not include id_token.");
  return bundle;
}
