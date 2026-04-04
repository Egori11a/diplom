import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { DbService } from "../db/db.service";

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
  constructor(private readonly db: DbService) {}

  async list(): Promise<{ groups: GroupView[] }> {
    const groups = await this.db.pg.query<GroupRow>(
      "SELECT id, name, description FROM groups ORDER BY created_at DESC"
    );

    const items = await Promise.all(groups.rows.map((group) => this.mapGroup(group)));
    return { groups: items };
  }

  async create(dto: { name: string; description: string }): Promise<{ id: string }> {
    try {
      const result = await this.db.pg.query<{ id: string }>(
        `
        INSERT INTO groups (id, name, description)
        VALUES (gen_random_uuid(), $1, $2)
        RETURNING id
        `,
        [dto.name, dto.description]
      );
      return { id: result.rows[0].id };
    } catch (error: unknown) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(`Group "${dto.name}" already exists`);
      }
      throw error;
    }
  }

  async update(
    id: string,
    dto: { name?: string; description?: string }
  ): Promise<{ id: string }> {
    const found = await this.findById(id);
    if (!found) {
      throw new NotFoundException("Group not found");
    }
    const previousName = found.name;

    try {
      await this.db.pg.query(
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
        await this.renameGroupInExperiments(previousName, nextName);
      }

      return { id };
    } catch (error: unknown) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(`Group "${dto.name}" already exists`);
      }
      throw error;
    }
  }

  async remove(id: string): Promise<{ ok: true }> {
    const found = await this.db.pg.query<{ name: string }>(
      "SELECT name FROM groups WHERE id = $1",
      [id]
    );
    const groupName = found.rows[0]?.name;

    await this.db.pg.query("DELETE FROM groups WHERE id = $1", [id]);

    if (groupName) {
      await this.removeGroupFromExperiments(groupName);
    }

    return { ok: true };
  }

  async addMember(groupId: string, memberKey: string): Promise<{ ok: true }> {
    const found = await this.db.pg.query("SELECT id FROM groups WHERE id = $1", [groupId]);
    if (!found.rowCount) {
      throw new NotFoundException("Group not found");
    }

    await this.db.pg.query(
      `
      INSERT INTO group_members (id, group_id, member_key)
      VALUES (gen_random_uuid(), $1, $2)
      ON CONFLICT (group_id, member_key) DO NOTHING
      `,
      [groupId, memberKey]
    );

    return { ok: true };
  }

  async removeMember(groupId: string, memberKey: string): Promise<{ ok: true }> {
    await this.db.pg.query(
      "DELETE FROM group_members WHERE group_id = $1 AND member_key = $2",
      [groupId, memberKey]
    );
    return { ok: true };
  }

  private async mapGroup(group: GroupRow): Promise<GroupView> {
    const members = await this.fetchGroupMembers(group.id);
    return {
      id: group.id,
      name: group.name,
      description: group.description,
      members
    };
  }

  private async fetchGroupMembers(groupId: string): Promise<GroupMemberRow[]> {
    const members = await this.db.pg.query<GroupMemberRow>(
      "SELECT member_key AS \"memberKey\" FROM group_members WHERE group_id = $1 ORDER BY member_key",
      [groupId]
    );
    return members.rows;
  }

  private async findById(id: string): Promise<GroupNameRow | null> {
    const found = await this.db.pg.query<GroupNameRow>(
      "SELECT id, name FROM groups WHERE id = $1",
      [id]
    );
    return found.rows[0] ?? null;
  }

  private async findExperimentsByGroupName(
    groupName: string
  ): Promise<ExperimentSegmentRow[]> {
    const affectedExperiments = await this.db.pg.query<ExperimentSegmentRow>(
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
    includeGroups: string[]
  ): Promise<void> {
    await this.db.pg.query(
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
    nextName: string
  ): Promise<void> {
    const affectedExperiments = await this.findExperimentsByGroupName(previousName);

    for (const experiment of affectedExperiments) {
      const includeGroups = experiment.segment_rules?.includeGroups ?? [];
      const updatedIncludeGroups = includeGroups.map((name) =>
        name === previousName ? nextName : name
      );
      await this.updateExperimentIncludeGroups(experiment.id, updatedIncludeGroups);
    }
  }

  private async removeGroupFromExperiments(groupName: string): Promise<void> {
    const affectedExperiments = await this.findExperimentsByGroupName(groupName);

    for (const experiment of affectedExperiments) {
      const includeGroups = experiment.segment_rules?.includeGroups ?? [];
      const updatedIncludeGroups = includeGroups.filter((name) => name !== groupName);
      await this.updateExperimentIncludeGroups(experiment.id, updatedIncludeGroups);
    }
  }
}
