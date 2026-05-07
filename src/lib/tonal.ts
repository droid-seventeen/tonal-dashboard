import { TonalMember } from "./members";
import { groupActivitiesByWeek, normalizeStrengthScores, topReadyMuscles } from "./metrics";

const AUTH0_CLIENT_ID = "ERCyexW-xoVG_Yy3RDe-eV4xsOnRHP6L";
const AUTH0_TOKEN_URL = "https://tonal.auth0.com/oauth/token";
const TONAL_API_BASE = "https://api.tonal.com";

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
  activities: TonalActivity[];
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

type UserInfo = { id?: string; sub?: string; userId?: string };

const tokenCache = new Map<string, { token: string; expiresAt: number; refreshToken?: string }>();

export async function getFamilyDashboard(member: TonalMember): Promise<TonalDashboard> {
  const client = await TonalClient.forMember(member);
  const errors: string[] = [];

  const userInfo = await client.get<UserInfo>("/v6/users/userinfo");
  const userId = userInfo.id ?? userInfo.userId ?? userInfo.sub;
  if (!userId) throw new Error("Tonal userinfo response did not include a user id.");

  const [profile, strengthRaw, readinessRaw, activitiesRaw] = await Promise.all([
    client.get<Record<string, unknown>>(`/v6/users/${userId}`).catch((error) => noteError(errors, "profile", error)),
    client.get<unknown[]>(`/v6/users/${userId}/strength-scores/current`).catch((error) => noteError(errors, "strength", error)),
    client.get<Record<string, number>>(`/v6/users/${userId}/muscle-readiness/current`).catch((error) => noteError(errors, "readiness", error)),
    client.get<TonalActivity[]>(`/v6/users/${userId}/activities?limit=20`).catch((error) => noteError(errors, "activities", error))
  ]);

  const activities = Array.isArray(activitiesRaw) ? activitiesRaw : [];
  const readiness = readinessRaw && !Array.isArray(readinessRaw) ? readinessRaw : {};

  return {
    member: { id: member.id, name: member.name },
    fetchedAt: new Date().toISOString(),
    profile: profile && !Array.isArray(profile) ? profile : undefined,
    strength: normalizeStrengthScores(Array.isArray(strengthRaw) ? (strengthRaw as never[]) : []),
    readiness,
    topReady: topReadyMuscles(readiness),
    activities,
    weeklyVolume: groupActivitiesByWeek(activities),
    errors
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

  async get<T>(path: string): Promise<T> {
    const response = await fetch(`${TONAL_API_BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json"
      },
      cache: "no-store"
    });

    if (response.status === 401) {
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
        return this.get<T>(path);
      }
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Tonal API ${response.status} ${response.statusText}${body ? `: ${body.slice(0, 200)}` : ""}`);
    }

    return (await response.json()) as T;
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
