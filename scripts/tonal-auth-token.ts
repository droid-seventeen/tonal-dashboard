#!/usr/bin/env tsx
import { stdin, stdout } from "process";

const AUTH0_CLIENT_ID = "ERCyexW-xoVG_Yy3RDe-eV4xsOnRHP6L";

async function main() {
  const [email, passwordArg] = process.argv.slice(2);
  if (!email) {
    console.error("Usage: npm run auth:token -- you@example.com");
    console.error("Optional non-interactive mode: TONAL_PASSWORD=... npm run auth:token -- you@example.com");
    process.exit(1);
  }

  const password = process.env.TONAL_PASSWORD || passwordArg || (await promptHidden("Tonal password: "));

  const response = await fetch("https://tonal.auth0.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "password",
      username: email,
      password,
      client_id: AUTH0_CLIENT_ID,
      scope: "openid profile email offline_access"
    })
  });

  if (!response.ok) {
    console.error(await response.text());
    process.exit(1);
  }

  const body = (await response.json()) as { refresh_token?: string };
  if (!body.refresh_token) {
    console.error("Auth succeeded but no refresh_token was returned.");
    process.exit(1);
  }

  console.log(body.refresh_token);
}

function promptHidden(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    stdout.write(prompt);
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let value = "";
    const onData = (char: string) => {
      if (char === "\u0003") process.exit(130);
      if (char === "\r" || char === "\n") {
        stdout.write("\n");
        stdin.setRawMode?.(false);
        stdin.pause();
        stdin.off("data", onData);
        resolve(value);
        return;
      }
      if (char === "\u007f") {
        value = value.slice(0, -1);
        return;
      }
      value += char;
    };
    stdin.on("data", onData);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
