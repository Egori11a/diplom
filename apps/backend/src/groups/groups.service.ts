import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { AuthenticatedAdmin } from "../auth/authenticated-admin";
import { AuditService } from "../audit/audit.service";
import { DbService } from "../db/db.service";
import type { Queryable } from "../db/queryable";

interface GroupRow {
  id: string;
  name: string;
  description: string;
}

interface GroupNameRow {
  id: string;
  name: string;
}

interface GroupMemberRow {
  memberKey: string;
}

interface GroupView {
  id: string;
  name: string;
  description: string;
  members: GroupMemberRow[];
}

interface ExperimentSegmentRules {
  includeGroups?: string[];
}

interface ExperimentSegmentRow {
  id: string;
  segment_rules: ExperimentSegmentRules | null;
}

interface PgErrorWithCode {
  code?: string;
}

const UNIQUE_VIOLATION_CODE = "23505";

const isUniqueViolation = (error: unknown): error is PgErrorWithCode => {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  return (error as PgErrorWithCode).code === UNIQUE_VIOLATION_CODE;
};

@Injectable()
export class GroupsService {
  constructor(
    private readonly db: DbService,
    private readonly auditService: AuditService
  ) {}

  async list(): Promise<{ groups: GroupView[] }> {
    const groups = await this.db.pg.query<GroupRow>(
      "SELECT id, name, description FROM groups ORDER BY created_at DESC"
    );

    const items = await Promise.all(groups.rows.map((group) => this.mapGroup(group)));
    return { groups: items };
  }

  async create(
    dto: { name: string; description: string },
    actor: AuthenticatedAdmin
  ): Promise<{ id: string }> {
    return this.db.withTransaction(async (queryable) => {
      let result;

      try {
        result = await queryable.query<{ id: string }>(
          `
          INSERT INTO groups (id, name, description)
          VALUES (gen_random_uuid(), $1, $2)
          RETURNING id
          `,
          [dto.name, dto.description]
        );
      } catch (error: unknown) {
        if (isUniqueViolation(error)) {
          throw new ConflictException(`Group "${dto.name}" already exists`);
        }
        throw error;
      }

      const created = await this.getGroupSnapshot(result.rows[0].id, queryable);

      await this.auditService.log(
        {
          actor,
          action: "group.created",
          entityType: "group",
          entityId: created.id,
          entityLabel: created.name,
          afterState: created
        },
        queryable
      );

      return { id: created.id };
    });
  }

  async update(
    id: string,
    dto: { name?: string; description?: string },
    actor: AuthenticatedAdmin
  ): Promise<{ id: string }> {
    return this.db.withTransaction(async (queryable) => {
      const found = await this.findById(id, queryable);
      if (!found) {
        throw new NotFoundException("Group not found");
      }

      const before = await this.getGroupSnapshot(id, queryable);
      const previousName = found.name;

      try {
        await queryable.query(
          `
          UPDATE groups
          SET name = COALESCE($1, name),
              description = COALESCE($2, description)
          WHERE id = $3
          `,
          [dto.name ?? null, dto.description ?? null, id]
        );

        const nextName = dto.name?.trim();
        if (nextName && nextName !== previousName) {
          await this.renameGroupInExperiments(previousName, nextName, queryable);
        }
      } catch (error: unknown) {
        if (isUniqueViolation(error)) {
          throw new ConflictException(`Group "${dto.name}" already exists`);
        }
        throw error;
      }

      const after = await this.getGroupSnapshot(id, queryable);

      await this.auditService.log(
        {
          actor,
          action: "group.updated",
          entityType: "group",
          entityId: after.id,
          entityLabel: after.name,
          beforeState: before,
          afterState: after
        },
        queryable
      );

      return { id };
    });
  }

  async remove(id: string, actor: AuthenticatedAdmin): Promise<{ ok: true }> {
    return this.db.withTransaction(async (queryable) => {
      const before = await this.getGroupSnapshot(id, queryable);

      await queryable.query("DELETE FROM groups WHERE id = $1", [id]);
      await this.removeGroupFromExperiments(before.name, queryable);

      await this.auditService.log(
        {
          actor,
          action: "group.deleted",
          entityType: "group",
          entityId: before.id,
          entityLabel: before.name,
          beforeState: before
        },
        queryable
      );

      return { ok: true };
    });
  }

  async addMember(
    groupId: string,
    memberKey: string,
    actor: AuthenticatedAdmin
  ): Promise<{ ok: true }> {
    return this.db.withTransaction(async (queryable) => {
      const before = await this.getGroupSnapshot(groupId, queryable);

      await queryable.query(
        `
        INSERT INTO group_members (id, group_id, member_key)
        VALUES (gen_random_uuid(), $1, $2)
        ON CONFLICT (group_id, member_key) DO NOTHING
        `,
        [groupId, memberKey]
      );

      const after = await this.getGroupSnapshot(groupId, queryable);

      await this.auditService.log(
        {
          actor,
          action: "group.member_added",
          entityType: "group",
          entityId: after.id,
          entityLabel: after.name,
          beforeState: before,
          afterState: after,
          meta: { memberKey }
        },
        queryable
      );

      return { ok: true };
    });
  }

  async removeMember(
    groupId: string,
    memberKey: string,
    actor: AuthenticatedAdmin
  ): Promise<{ ok: true }> {
    return this.db.withTransaction(async (queryable) => {
      const before = await this.getGroupSnapshot(groupId, queryable);

      await queryable.query(
        "DELETE FROM group_members WHERE group_id = $1 AND member_key = $2",
        [groupId, memberKey]
      );

      const after = await this.getGroupSnapshot(groupId, queryable);

      await this.auditService.log(
        {
          actor,
          action: "group.member_removed",
          entityType: "group",
          entityId: after.id,
          entityLabel: after.name,
          beforeState: before,
          afterState: after,
          meta: { memberKey }
        },
        queryable
      );

      return { ok: true };
    });
  }

  private async mapGroup(group: GroupRow): Promise<GroupView> {
    const members = await this.fetchGroupMembers(group.id, this.db.pg);
    return {
      id: group.id,
      name: group.name,
      description: group.description,
      members
    };
  }

  private async fetchGroupMembers(
    groupId: string,
    queryable: Queryable
  ): Promise<GroupMemberRow[]> {
    const members = await queryable.query<GroupMemberRow>(
      `SELECT member_key AS "memberKey"
       FROM group_members
       WHERE group_id = $1
       ORDER BY member_key`,
      [groupId]
    );
    return members.rows;
  }

  private async findById(id: string, queryable: Queryable): Promise<GroupNameRow | null> {
    const found = await queryable.query<GroupNameRow>(
      "SELECT id, name FROM groups WHERE id = $1",
      [id]
    );
    return found.rows[0] ?? null;
  }

  private async getGroupSnapshot(id: string, queryable: Queryable): Promise<GroupView> {
    const result = await queryable.query<GroupRow>(
      "SELECT id, name, description FROM groups WHERE id = $1",
      [id]
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException("Group not found");
    }

    const members = await this.fetchGroupMembers(id, queryable);

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      members
    };
  }

  private async findExperimentsByGroupName(
    groupName: string,
    queryable: Queryable
  ): Promise<ExperimentSegmentRow[]> {
    const affectedExperiments = await queryable.query<ExperimentSegmentRow>(
      `
      SELECT id, segment_rules
      FROM experiments
      WHERE segment_rules->'includeGroups' ? $1
      `,
      [groupName]
    );

    return affectedExperiments.rows;
  }

  private async updateExperimentIncludeGroups(
    experimentId: string,
    includeGroups: string[],
    queryable: Queryable
  ): Promise<void> {
    await queryable.query(
      `
      UPDATE experiments
      SET segment_rules = jsonb_set(
        COALESCE(segment_rules, '{}'::jsonb),
        '{includeGroups}',
        $1::jsonb,
        true
      ),
      updated_at = NOW()
      WHERE id = $2
      `,
      [JSON.stringify(includeGroups), experimentId]
    );
  }

  private async renameGroupInExperiments(
    previousName: string,
    nextName: string,
    queryable: Queryable
  ): Promise<void> {
    const affectedExperiments = await this.findExperimentsByGroupName(previousName, queryable);

    for (const experiment of affectedExperiments) {
      const includeGroups = experiment.segment_rules?.includeGroups ?? [];
      const updatedIncludeGroups = includeGroups.map((name) =>
        name === previousName ? nextName : name
      );
      await this.updateExperimentIncludeGroups(experiment.id, updatedIncludeGroups, queryable);
    }
  }

  private async removeGroupFromExperiments(
    groupName: string,
    queryable: Queryable
  ): Promise<void> {
    const affectedExperiments = await this.findExperimentsByGroupName(groupName, queryable);

    for (const experiment of affectedExperiments) {
      const includeGroups = experiment.segment_rules?.includeGroups ?? [];
      const updatedIncludeGroups = includeGroups.filter((name) => name !== groupName);
      await this.updateExperimentIncludeGroups(experiment.id, updatedIncludeGroups, queryable);
    }
  }
}
