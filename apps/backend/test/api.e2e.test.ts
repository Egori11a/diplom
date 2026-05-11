import request from "supertest";
import { Client } from "pg";
import { isExperimentEnabled, resolveVariant } from "../../../packages/sdk/src/assignment";
import type { ActiveExperiment } from "../../../packages/sdk/src/types";

const api = request(process.env.BACKEND_BASE_URL ?? "http://localhost:3000");

describe("Backend E2E", () => {
  let token = "";
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
  const groupName = `e2e-group-${suffix}`;
  const updatedGroupName = `e2e-group-updated-${suffix}`;
  const experimentKey = `e2e-toggle-${suffix}`;
  const includeIdKey = `e2e-include-id-${suffix}`;
  const includeGroupKey = `e2e-include-group-${suffix}`;
  const rolloutZeroKey = `e2e-rollout-zero-${suffix}`;
  const rolloutHundredKey = `e2e-rollout-hundred-${suffix}`;
  const trafficZeroKey = `e2e-traffic-zero-${suffix}`;
  const simpleToggleKey = `e2e-simple-toggle-${suffix}`;
  const targetSubjectKey = `target-subject-${suffix}`;
  const targetGroup = `qa-canary-${suffix}`;
  const viewerEmail = `viewer-${suffix}@local.test`;
  const viewerPassword = `viewer-pass-${suffix}`;
  let groupId = "";
  let viewerToken = "";
  let viewerUserId = "";
  const experimentIds: string[] = [];

  const baseVariants = [
    { key: "A", weightPercent: 50, payload: { label: "A" } },
    { key: "B", weightPercent: 50, payload: { label: "B" } }
  ];

  it("auth: logs in admin", async () => {
    const response = await api.post("/auth/login").send({
      email: "admin@local.test",
      password: "admin123"
    });

    expect(response.status).toBe(201);
    expect(response.body.accessToken).toEqual(expect.any(String));
    token = response.body.accessToken;
  });

  it("admin hardening: owner creates viewer user and viewer has read-only audit access", async () => {
    const createUserResponse = await api
      .post("/admin/users")
      .set("Authorization", `Bearer ${token}`)
      .send({
        email: viewerEmail,
        password: viewerPassword,
        role: "viewer"
      });

    expect(createUserResponse.status).toBe(201);
    viewerUserId = createUserResponse.body.id as string;

    const viewerLoginResponse = await api.post("/auth/login").send({
      email: viewerEmail,
      password: viewerPassword
    });

    expect(viewerLoginResponse.status).toBe(201);
    viewerToken = viewerLoginResponse.body.accessToken as string;

    const auditResponse = await api
      .get("/admin/audit-logs?limit=10")
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(auditResponse.status).toBe(200);
    expect(Array.isArray(auditResponse.body.logs)).toBe(true);
    expect(
      auditResponse.body.logs.some(
        (log: { action: string; entityLabel?: string }) =>
          log.action === "admin.created" && log.entityLabel === viewerEmail
      )
    ).toBe(true);

    const usersResponse = await api
      .get("/admin/users")
      .set("Authorization", `Bearer ${viewerToken}`);
    expect(usersResponse.status).toBe(403);
  });

  it("groups: create, update, add/remove member, delete", async () => {
    const createResponse = await api
      .post("/admin/groups")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: groupName,
        description: "E2E group"
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.id).toEqual(expect.any(String));
    groupId = createResponse.body.id;

    const addMemberResponse = await api
      .post(`/admin/groups/${groupId}/members`)
      .set("Authorization", `Bearer ${token}`)
      .send({ memberKey: `member-${suffix}` });
    expect(addMemberResponse.status).toBe(201);
    expect(addMemberResponse.body.ok).toBe(true);

    const updateResponse = await api
      .patch(`/admin/groups/${groupId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: updatedGroupName,
        description: "Updated"
      });
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.id).toBe(groupId);

    const listResponse = await api
      .get("/admin/groups")
      .set("Authorization", `Bearer ${token}`);
    expect(listResponse.status).toBe(200);
    expect(Array.isArray(listResponse.body.groups)).toBe(true);
    expect(
      listResponse.body.groups.some(
        (group: { id: string; name: string }) =>
          group.id === groupId && group.name === updatedGroupName
      )
    ).toBe(true);

    const removeMemberResponse = await api
      .delete(
        `/admin/groups/${groupId}/members/${encodeURIComponent(`member-${suffix}`)}`
      )
      .set("Authorization", `Bearer ${token}`);
    expect(removeMemberResponse.status).toBe(200);
    expect(removeMemberResponse.body.ok).toBe(true);
  });

  it("feature toggles: create, list, update, delete", async () => {
    const createResponse = await api
      .post("/admin/feature-toggles")
      .set("Authorization", `Bearer ${token}`)
      .send({
        appId: "demo-app",
        key: experimentKey,
        name: "E2E Toggle",
        featureKey: experimentKey,
        featureEnabled: true,
        status: "active",
        trafficPercent: 100,
        segmentRules: {
          includeGroups: [updatedGroupName],
          includeSubjectKeys: [],
          rolloutPercent: 100
        },
        variants: baseVariants
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.id).toEqual(expect.any(String));
    experimentIds.push(createResponse.body.id);
    const createdExperimentId = createResponse.body.id as string;

    const listResponse = await api
      .get("/admin/feature-toggles")
      .set("Authorization", `Bearer ${token}`);
    expect(listResponse.status).toBe(200);
    expect(
      listResponse.body.experiments.some(
        (experiment: { id: string; key: string }) =>
          experiment.id === createdExperimentId && experiment.key === experimentKey
      )
    ).toBe(true);

    const updateResponse = await api
      .patch(`/admin/feature-toggles/${createdExperimentId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        appId: "demo-app",
        key: experimentKey,
        name: "E2E Toggle Updated",
        featureKey: experimentKey,
        featureEnabled: true,
        status: "active",
        trafficPercent: 100,
        segmentRules: {
          includeGroups: [updatedGroupName],
          includeSubjectKeys: [],
          rolloutPercent: 100
        },
        variants: [
          { key: "A", weightPercent: 60, payload: { label: "A" } },
          { key: "B", weightPercent: 40, payload: { label: "B" } }
        ]
      });
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.id).toBe(createdExperimentId);

    const sdkResponse = await api.get(
      `/sdk/experiments/active?appId=${encodeURIComponent("demo-app")}`
    );
    expect(sdkResponse.status).toBe(200);
    expect(
      sdkResponse.body.experiments.some(
        (experiment: { key: string }) => experiment.key === experimentKey
      )
    ).toBe(true);
  });

  it("sdk rules e2e: includeSubjectKeys, includeGroups, rollout 0/100, traffic 0 -> control", async () => {
    const createToggle = async (
      key: string,
      segmentRules: {
        includeGroups: string[];
        includeSubjectKeys: string[];
        rolloutPercent: number;
      },
      trafficPercent: number
    ) => {
      const response = await api
        .post("/admin/feature-toggles")
        .set("Authorization", `Bearer ${token}`)
        .send({
          appId: "demo-app",
          key,
          name: key,
          featureKey: key,
          featureEnabled: true,
          status: "active",
          trafficPercent,
          segmentRules,
          variants: baseVariants
        });

      expect(response.status).toBe(201);
      experimentIds.push(response.body.id);
    };

    await createToggle(
      includeIdKey,
      {
        includeGroups: [],
        includeSubjectKeys: [targetSubjectKey],
        rolloutPercent: 0
      },
      100
    );
    await createToggle(
      includeGroupKey,
      {
        includeGroups: [targetGroup],
        includeSubjectKeys: [],
        rolloutPercent: 0
      },
      100
    );
    await createToggle(
      rolloutZeroKey,
      {
        includeGroups: [],
        includeSubjectKeys: [],
        rolloutPercent: 0
      },
      100
    );
    await createToggle(
      rolloutHundredKey,
      {
        includeGroups: [],
        includeSubjectKeys: [],
        rolloutPercent: 100
      },
      100
    );
    await createToggle(
      trafficZeroKey,
      {
        includeGroups: [],
        includeSubjectKeys: [],
        rolloutPercent: 100
      },
      0
    );
    await createToggle(
      simpleToggleKey,
      {
        includeGroups: [],
        includeSubjectKeys: [],
        rolloutPercent: 100
      },
      100
    );

    const createSimpleNoVariants = await api
      .post("/admin/feature-toggles")
      .set("Authorization", `Bearer ${token}`)
      .send({
        appId: "demo-app",
        key: `${simpleToggleKey}-no-variants`,
        name: `${simpleToggleKey}-no-variants`,
        featureKey: `${simpleToggleKey}-no-variants`,
        featureEnabled: true,
        status: "active",
        trafficPercent: 100,
        segmentRules: {
          includeGroups: [],
          includeSubjectKeys: [],
          rolloutPercent: 100
        },
        variants: []
      });
    expect(createSimpleNoVariants.status).toBe(201);
    experimentIds.push(createSimpleNoVariants.body.id);

    const sdkResponse = await api.get(
      `/sdk/experiments/active?appId=${encodeURIComponent("demo-app")}`
    );
    expect(sdkResponse.status).toBe(200);

    const experiments = sdkResponse.body.experiments as ActiveExperiment[];
    const byKey = new Map(experiments.map((item) => [item.key, item]));

    const includeByIdExperiment = byKey.get(includeIdKey);
    const includeByGroupExperiment = byKey.get(includeGroupKey);
    const rolloutZeroExperiment = byKey.get(rolloutZeroKey);
    const rolloutHundredExperiment = byKey.get(rolloutHundredKey);
    const trafficZeroExperiment = byKey.get(trafficZeroKey);
    const simpleNoVariantsExperiment = byKey.get(`${simpleToggleKey}-no-variants`);

    expect(includeByIdExperiment).toBeDefined();
    expect(includeByGroupExperiment).toBeDefined();
    expect(rolloutZeroExperiment).toBeDefined();
    expect(rolloutHundredExperiment).toBeDefined();
    expect(trafficZeroExperiment).toBeDefined();
    expect(simpleNoVariantsExperiment).toBeDefined();

    expect(
      isExperimentEnabled(targetSubjectKey, [], includeByIdExperiment!)
    ).toBe(true);
    expect(
      isExperimentEnabled(`other-${suffix}`, [], includeByIdExperiment!)
    ).toBe(false);

    expect(
      isExperimentEnabled(`other-${suffix}`, [targetGroup], includeByGroupExperiment!)
    ).toBe(true);
    expect(
      isExperimentEnabled(
        `other-${suffix}`,
        ["another-group"],
        includeByGroupExperiment!
      )
    ).toBe(false);

    expect(
      isExperimentEnabled(`other-${suffix}`, [], rolloutZeroExperiment!)
    ).toBe(false);
    expect(
      isExperimentEnabled(`other-${suffix}`, [], rolloutHundredExperiment!)
    ).toBe(true);

    expect(resolveVariant(`other-${suffix}`, trafficZeroExperiment!)).toBe("control");
    expect(resolveVariant(`other-${suffix}`, simpleNoVariantsExperiment!)).toBe("on");
  });

  it("events: accepts batch ingestion", async () => {
    const response = await api.post("/sdk/events/batch").send({
      events: [
        {
          event_id: `e2e-event-${suffix}`,
          app_id: "demo-app",
          subject_key: `subject-${suffix}`,
          experiment_key: experimentKey,
          variant_key: "A",
          type: "impression",
          ts: new Date().toISOString(),
          meta: { source: "e2e" }
        }
      ]
    });

    expect(response.status).toBe(202);
    expect(response.body.accepted).toBe(1);
  });

  it("analytics: returns metrics for selected toggle", async () => {
    const response = await api
      .get(
        `/admin/analytics/feature-toggles/${encodeURIComponent(experimentKey)}?appId=demo-app`
      )
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.experimentKey).toBe(experimentKey);
    expect(response.body.metrics.impressions).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(response.body.variants)).toBe(true);
  });

  it("admin hardening: audit tracks role changes and activation state", async () => {
    const updateRoleResponse = await api
      .patch(`/admin/users/${viewerUserId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ role: "editor" });
    expect(updateRoleResponse.status).toBe(200);

    const deactivateResponse = await api
      .post(`/admin/users/${viewerUserId}/deactivate`)
      .set("Authorization", `Bearer ${token}`)
      .send();
    expect(deactivateResponse.status).toBe(201);

    const activateResponse = await api
      .post(`/admin/users/${viewerUserId}/activate`)
      .set("Authorization", `Bearer ${token}`)
      .send();
    expect(activateResponse.status).toBe(201);

    const auditResponse = await api
      .get(`/admin/audit-logs?entityType=admin&limit=20`)
      .set("Authorization", `Bearer ${token}`);
    expect(auditResponse.status).toBe(200);

    const logs = auditResponse.body.logs as Array<{
      action: string;
      entityLabel?: string;
      afterState?: { role?: string; isActive?: boolean };
    }>;

    expect(
      logs.some(
        (log) =>
          log.action === "admin.role_changed" &&
          log.entityLabel === viewerEmail &&
          log.afterState?.role === "editor"
      )
    ).toBe(true);
    expect(
      logs.some(
        (log) =>
          log.action === "admin.deactivated" &&
          log.entityLabel === viewerEmail &&
          log.afterState?.isActive === false
      )
    ).toBe(true);
    expect(
      logs.some(
        (log) =>
          log.action === "admin.activated" &&
          log.entityLabel === viewerEmail &&
          log.afterState?.isActive === true
      )
    ).toBe(true);
  });

  afterAll(async () => {
    for (const id of experimentIds) {
      await api
        .delete(`/admin/feature-toggles/${id}`)
        .set("Authorization", `Bearer ${token}`);
    }

    if (groupId) {
      await api
        .delete(`/admin/groups/${groupId}`)
        .set("Authorization", `Bearer ${token}`);
    }

    if (viewerEmail) {
      const client = new Client({
        connectionString:
          process.env.POSTGRES_URL ??
          "postgres://postgres:postgres@localhost:5432/ab_platform"
      });
      await client.connect();
      try {
        await client.query(
          `
          DELETE FROM audit_logs
          WHERE actor_email = $1
             OR entity_label = $1
          `,
          [viewerEmail]
        );
        await client.query("DELETE FROM admins WHERE email = $1", [viewerEmail]);
      } finally {
        await client.end();
      }
    }
  });
});
