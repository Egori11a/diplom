import request from "supertest";

const api = request(process.env.BACKEND_BASE_URL ?? "http://localhost:3000");

describe("Backend E2E", () => {
  let token = "";
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
  const groupName = `e2e-group-${suffix}`;
  const updatedGroupName = `e2e-group-updated-${suffix}`;
  const experimentKey = `e2e-toggle-${suffix}`;
  let groupId = "";
  let experimentId = "";

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
      listResponse.body.groups.some((group: { id: string; name: string }) => group.id === groupId && group.name === updatedGroupName)
    ).toBe(true);

    const removeMemberResponse = await api
      .delete(`/admin/groups/${groupId}/members/${encodeURIComponent(`member-${suffix}`)}`)
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
        variants: [
          { key: "A", weightPercent: 50, payload: { label: "A" } },
          { key: "B", weightPercent: 50, payload: { label: "B" } }
        ]
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.id).toEqual(expect.any(String));
    experimentId = createResponse.body.id;

    const listResponse = await api
      .get("/admin/feature-toggles")
      .set("Authorization", `Bearer ${token}`);
    expect(listResponse.status).toBe(200);
    expect(
      listResponse.body.experiments.some(
        (experiment: { id: string; key: string }) =>
          experiment.id === experimentId && experiment.key === experimentKey
      )
    ).toBe(true);

    const updateResponse = await api
      .patch(`/admin/feature-toggles/${experimentId}`)
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
    expect(updateResponse.body.id).toBe(experimentId);

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

  afterAll(async () => {
    if (experimentId) {
      await api
        .delete(`/admin/feature-toggles/${experimentId}`)
        .set("Authorization", `Bearer ${token}`);
    }

    if (groupId) {
      await api
        .delete(`/admin/groups/${groupId}`)
        .set("Authorization", `Bearer ${token}`);
    }
  });
});
