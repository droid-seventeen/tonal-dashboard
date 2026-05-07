import { z } from "zod";

const MemberSchema = z
  .object({
    id: z.string().min(1).regex(/^[a-zA-Z0-9_-]+$/, "member id must be URL-safe"),
    name: z.string().min(1),
    email: z.string().email().optional(),
    password: z.string().min(1).optional(),
    refreshToken: z.string().min(1).optional()
  })
  .superRefine((member, ctx) => {
    const hasRefresh = Boolean(member.refreshToken);
    const hasPasswordLogin = Boolean(member.email && member.password);
    if (!hasRefresh && !hasPasswordLogin) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Each member needs either refreshToken or email+password credentials."
      });
    }
  });

export type TonalMember = z.infer<typeof MemberSchema>;
export type PublicMember = Pick<TonalMember, "id" | "name">;

export function parseMembersFromEnv(raw = process.env.TONAL_MEMBERS_JSON): TonalMember[] {
  if (!raw?.trim()) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`TONAL_MEMBERS_JSON is not valid JSON: ${(error as Error).message}`);
  }

  const members = z.array(MemberSchema).min(1).parse(parsed);
  const seen = new Set<string>();
  for (const member of members) {
    if (seen.has(member.id)) throw new Error(`Duplicate Tonal member id: ${member.id}`);
    seen.add(member.id);
  }

  return members;
}

export function publicMember(member: TonalMember): PublicMember {
  return { id: member.id, name: member.name };
}

export function getMemberById(memberId: string, members = parseMembersFromEnv()): TonalMember {
  const member = members.find((candidate) => candidate.id === memberId);
  if (!member) throw new Error(`Unknown member id: ${memberId}`);
  return member;
}
