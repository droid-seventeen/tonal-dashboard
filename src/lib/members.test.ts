import { describe, expect, it } from "vitest";
import { parseMembersFromEnv, publicMember } from "./members";

describe("parseMembersFromEnv", () => {
  it("accepts multiple configured Tonal family members", () => {
    const members = parseMembersFromEnv(
      JSON.stringify([
        { id: "mom", name: "Mom", refreshToken: "rt-1" },
        { id: "dad", name: "Dad", email: "dad@example.com", password: "secret" }
      ])
    );

    expect(members.map((member) => member.id)).toEqual(["mom", "dad"]);
    expect(publicMember(members[1])).toEqual({ id: "dad", name: "Dad" });
  });

  it("rejects members without a refresh token or password credentials", () => {
    expect(() => parseMembersFromEnv('[{"id":"x","name":"X"}]')).toThrow(
      /refreshToken or email\+password/
    );
  });

  it("rejects duplicate member ids", () => {
    const raw = JSON.stringify([
      { id: "same", name: "One", refreshToken: "rt-1" },
      { id: "same", name: "Two", refreshToken: "rt-2" }
    ]);

    expect(() => parseMembersFromEnv(raw)).toThrow(/Duplicate/);
  });
});
