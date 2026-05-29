import assert from "node:assert/strict";
import { AddressInfo } from "node:net";
import test from "node:test";
import { app } from "../server/index";

async function withServer(run: (baseUrl: string) => Promise<void>) {
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const { port } = server.address() as AddressInfo;
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

async function json<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) throw new Error(JSON.stringify(body));
  return body as T;
}

test("auth, user-scoped dashboard, settings, job creation, and generation flow", async () => {
  await withServer(async (baseUrl) => {
    const email = `api-${Date.now()}@example.com`;
    const registered = await json<{ token: string; user: { email: string } }>(
      await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "API Tester", email, password: "password123" })
      })
    );
    assert.equal(registered.user.email, email);

    const headers = { "Content-Type": "application/json", Authorization: `Bearer ${registered.token}` };
    const dashboard = await json<{ jobs: unknown[]; momentumScore: { overall: number } }>(
      await fetch(`${baseUrl}/api/dashboard`, { headers })
    );
    assert.equal(dashboard.jobs.length, 3);
    assert.ok(dashboard.momentumScore.overall > 0);

    const settings = await json<{ settings: { dailyAgentEnabled: boolean; analysisLimit: number } }>(
      await fetch(`${baseUrl}/api/settings`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ dailyAgentEnabled: false, analysisLimit: 25 })
      })
    );
    assert.equal(settings.settings.dailyAgentEnabled, false);

    const job = await json<{ id: string; title: string; description: string }>(
      await fetch(`${baseUrl}/api/jobs/manual`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: "<b>Validation Technician</b>",
          company: "API Labs",
          location: "Detroit, MI",
          source: "API test",
          pay: "$35/hr",
          description: "<script>alert(1)</script>Validation technician role with Jira, diagnostics, test cases, automotive troubleshooting, and growth."
        })
      })
    );
    assert.equal(job.title, "Validation Technician");
    assert.ok(!job.description.includes("<script>"));

    const generated = await json<{ resume: string; coverLetter: string; checklist: string[] }>(
      await fetch(`${baseUrl}/api/jobs/${job.id}/generate`, { method: "POST", headers })
    );
    assert.ok(generated.resume.includes("Validation Technician"));
    assert.ok(generated.coverLetter.length > 100);
    assert.ok(generated.checklist.some((item) => item.includes("review")));
  });
});

test("invalid tokens are rejected and reset endpoint returns safe demo response", async () => {
  await withServer(async (baseUrl) => {
    const rejected = await fetch(`${baseUrl}/api/dashboard`, { headers: { Authorization: "Bearer bad-token" } });
    assert.equal(rejected.status, 401);

    const reset = await json<{ ok: boolean; resetToken: string }>(
      await fetch(`${baseUrl}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "demo@momentumai.local" })
      })
    );
    assert.equal(reset.ok, true);
    assert.ok(reset.resetToken);
  });
});
