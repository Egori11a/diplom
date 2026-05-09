import request from "supertest";
import { resolveAssignment } from "../../../packages/sdk/src/assignment";
import type { ActiveExperiment } from "../../../packages/sdk/src/types";

const api = request(process.env.BACKEND_BASE_URL ?? "http://localhost:3000");

interface DemoUser {
  subjectKey: string;
  groups: string[];
}

describe("Assignment Matrix E2E", () => {
  let token = "";
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;

  const coreGroupName = `team:core-${suffix}`;
  const qaGroupName = `team:qa-${suffix}`;
  const betaGroupName = `team:beta-${suffix}`;

  const groupIds: string[] = [];
  const toggleIds: string[] = [];

  const toggleBySubjectKey = `matrix-by-subject-${suffix}`;
  const toggleByGroupKey = `matrix-by-group-${suffix}`;
  const toggleTrafficZeroKey = `matrix-traffic-zero-${suffix}`;
  const toggleVariantsKey = `matrix-variants-${suffix}`;
  const toggleMixedKey = `matrix-mixed-${suffix}`;

  const users: Record<string, DemoUser> = {
    egor: {
      subjectKey: "user:egor",
      groups: [coreGroupName, "role:owner"]
    },
    test: {
      subjectKey: "user:test",
      groups: [qaGroupName, "role:qa"]
    },
    maria: {
      subjectKey: "user:maria",
      groups: [betaGroupName, "role:pm"]
    },
    guest: {
      subjectKey: "user:guest",
      groups: ["role:guest"]
    }
  };

  const createGroup = async (name: string, description: string): Promise<string> => {
    const response = await api
      .post("/admin/groups")
      .set("Authorization", `Bearer ${token}`)
      .send({ name, description });

    expect(response.status).toBe(201);
    expect(response.body.id).toEqual(expect.any(String));

    groupIds.push(response.body.id);
    return response.body.id as string;
  };

  const addMember = async (groupId: string, memberKey: string): Promise<void> => {
    const response = await api
      .post(`/admin/groups/${groupId}/members`)
      .set("Authorization", `Bearer ${token}`)
      .send({ memberKey });

    expect(response.status).toBe(201);
    expect(response.body.ok).toBe(true);
  };

  const createToggle = async (payload: {
    appId: string;
    key: string;
    name: string;
    featureKey: string;
    featureEnabled: boolean;
    status: "active";
    trafficPercent: number;
    segmentRules: {
      includeSubjectKeys: string[];
      includeGroups: string[];
      rolloutPercent: number;
    };
    variants: Array<{ key: string; weightPercent: number; payload?: Record<string, unknown> }>;
  }): Promise<void> => {
    const response = await api
      .post("/admin/feature-toggles")
      .set("Authorization", `Bearer ${token}`)
      .send(payload);

    expect(response.status).toBe(201);
    expect(response.body.id).toEqual(expect.any(String));
    toggleIds.push(response.body.id as string);
  };

  it("auth: logs in admin", async () => {
    const response = await api.post("/auth/login").send({
      email: "admin@local.test",
      password: "admin123"
    });

    expect(response.status).toBe(201);
    expect(response.body.accessToken).toEqual(expect.any(String));
    token = response.body.accessToken;
  });

  it("creates groups, toggles and verifies assignment matrix for users", async () => {
    const coreGroupId = await createGroup(coreGroupName, "Core team");
    const qaGroupId = await createGroup(qaGroupName, "QA team");
    const betaGroupId = await createGroup(betaGroupName, "Beta team");

    await addMember(coreGroupId, users.egor.subjectKey);
    await addMember(qaGroupId, users.test.subjectKey);
    await addMember(betaGroupId, users.maria.subjectKey);

    await createToggle({
      appId: "demo-app",
      key: toggleBySubjectKey,
      name: toggleBySubjectKey,
      featureKey: toggleBySubjectKey,
      featureEnabled: true,
      status: "active",
      trafficPercent: 100,
      segmentRules: {
        includeSubjectKeys: [users.egor.subjectKey],
        includeGroups: [],
        rolloutPercent: 0
      },
      variants: []
    });

    await createToggle({
      appId: "demo-app",
      key: toggleByGroupKey,
      name: toggleByGroupKey,
      featureKey: toggleByGroupKey,
      featureEnabled: true,
      status: "active",
      trafficPercent: 100,
      segmentRules: {
        includeSubjectKeys: [],
        includeGroups: [qaGroupName],
        rolloutPercent: 0
      },
      variants: []
    });

    await createToggle({
      appId: "demo-app",
      key: toggleTrafficZeroKey,
      name: toggleTrafficZeroKey,
      featureKey: toggleTrafficZeroKey,
      featureEnabled: true,
      status: "active",
      trafficPercent: 0,
      segmentRules: {
        includeSubjectKeys: [],
        includeGroups: [],
        rolloutPercent: 100
      },
      variants: [{ key: "A", weightPercent: 100 }]
    });

    await createToggle({
      appId: "demo-app",
      key: toggleVariantsKey,
      name: toggleVariantsKey,
      featureKey: toggleVariantsKey,
      featureEnabled: true,
      status: "active",
      trafficPercent: 100,
      segmentRules: {
        includeSubjectKeys: [],
        includeGroups: [betaGroupName],
        rolloutPercent: 0
      },
      variants: [
        { key: "A", weightPercent: 70 },
        { key: "B", weightPercent: 30 }
      ]
    });

    await createToggle({
      appId: "demo-app",
      key: toggleMixedKey,
      name: toggleMixedKey,
      featureKey: toggleMixedKey,
      featureEnabled: true,
      status: "active",
      trafficPercent: 100,
      segmentRules: {
        includeSubjectKeys: [users.guest.subjectKey],
        includeGroups: [coreGroupName],
        rolloutPercent: 0
      },
      variants: [{ key: "A", weightPercent: 100 }]
    });

    const activeResponse = await api.get("/sdk/experiments/active?appId=demo-app");
    expect(activeResponse.status).toBe(200);

    const experiments = activeResponse.body.experiments as ActiveExperiment[];
    const byKey = new Map(experiments.map((item) => [item.key, item]));

    const bySubject = byKey.get(toggleBySubjectKey);
    const byGroup = byKey.get(toggleByGroupKey);
    const trafficZero = byKey.get(toggleTrafficZeroKey);
    const variants = byKey.get(toggleVariantsKey);
    const mixed = byKey.get(toggleMixedKey);

    expect(bySubject).toBeDefined();
    expect(byGroup).toBeDefined();
    expect(trafficZero).toBeDefined();
    expect(variants).toBeDefined();
    expect(mixed).toBeDefined();

    expect(
      resolveAssignment(users.egor.subjectKey, users.egor.groups, bySubject!)
    ).toEqual({ enabled: true, variant: "on" });
    expect(
      resolveAssignment(users.test.subjectKey, users.test.groups, bySubject!)
    ).toEqual({ enabled: false, variant: "control" });

    expect(
      resolveAssignment(users.test.subjectKey, users.test.groups, byGroup!)
    ).toEqual({ enabled: true, variant: "on" });
    expect(
      resolveAssignment(users.maria.subjectKey, users.maria.groups, byGroup!)
    ).toEqual({ enabled: false, variant: "control" });

    expect(
      resolveAssignment(users.egor.subjectKey, users.egor.groups, trafficZero!)
    ).toEqual({ enabled: false, variant: "control" });
    expect(
      resolveAssignment(users.maria.subjectKey, users.maria.groups, trafficZero!)
    ).toEqual({ enabled: false, variant: "control" });

    const mariaFirst = resolveAssignment(
      users.maria.subjectKey,
      users.maria.groups,
      variants!
    );
    const mariaSecond = resolveAssignment(
      users.maria.subjectKey,
      users.maria.groups,
      variants!
    );
    expect(mariaFirst.enabled).toBe(true);
    expect(["A", "B"]).toContain(mariaFirst.variant);
    expect(mariaSecond).toEqual(mariaFirst);

    expect(
      resolveAssignment(users.egor.subjectKey, users.egor.groups, mixed!)
    ).toEqual({ enabled: true, variant: "A" });
    expect(
      resolveAssignment(users.guest.subjectKey, users.guest.groups, mixed!)
    ).toEqual({ enabled: true, variant: "A" });
    expect(
      resolveAssignment(users.test.subjectKey, users.test.groups, mixed!)
    ).toEqual({ enabled: false, variant: "control" });
  });

  afterAll(async () => {
    for (const toggleId of toggleIds) {
      await api
        .delete(`/admin/feature-toggles/${toggleId}`)
        .set("Authorization", `Bearer ${token}`);
    }

    for (const groupId of groupIds) {
      await api
        .delete(`/admin/groups/${groupId}`)
        .set("Authorization", `Bearer ${token}`);
    }
  });
});

