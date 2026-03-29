import request from "supertest";
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
  const targetAnonymousId = `target-anon-${suffix}`;
  const targetGroup = `qa-canary-${suffix}`;
  let groupId = "";
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
          includeAnonymousIds: [],
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
          includeAnonymousIds: [],
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

  it("sdk rules e2e: includeAnonymousIds, includeGroups, rollout 0/100, traffic 0 -> control", async () => {
    const createToggle = async (
      key: string,
      segmentRules: {
        includeGroups: string[];
        includeAnonymousIds: string[];
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
        includeAnonymousIds: [targetAnonymousId],
        rolloutPercent: 0
      },
      100
    );
    await createToggle(
      includeGroupKey,
      {
        includeGroups: [targetGroup],
        includeAnonymousIds: [],
        rolloutPercent: 0
      },
      100
    );
    await createToggle(
      rolloutZeroKey,
      {
        includeGroups: [],
        includeAnonymousIds: [],
        rolloutPercent: 0
      },
      100
    );
    await createToggle(
      rolloutHundredKey,
      {
        includeGroups: [],
        includeAnonymousIds: [],
        rolloutPercent: 100
      },
      100
    );
    await createToggle(
      trafficZeroKey,
      {
        includeGroups: [],
        includeAnonymousIds: [],
        rolloutPercent: 100
      },
      0
    );
    await createToggle(
      simpleToggleKey,
      {
        includeGroups: [],
        includeAnonymousIds: [],
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
          includeAnonymousIds: [],
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
      isExperimentEnabled(targetAnonymousId, [], includeByIdExperiment!)
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
          anonymous_id: `anon-${suffix}`,
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
  });
});
