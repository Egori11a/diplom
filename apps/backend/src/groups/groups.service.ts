import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { DbService } from "../db/db.service";

@Injectable()
export class GroupsService {
  constructor(private readonly db: DbService) {}

  async list(): Promise<{ groups: unknown[] }> {
    const groups = await this.db.pg.query(
      "SELECT id, name, description FROM groups ORDER BY created_at DESC"
    );

    const items = await Promise.all(
      groups.rows.map(async (group: any) => {
        const members = await this.db.pg.query(
          "SELECT member_key AS \"memberKey\" FROM group_members WHERE group_id = $1 ORDER BY member_key",
          [group.id]
        );
        return {
          id: group.id,
          name: group.name,
          description: group.description,
          members: members.rows
        };
      })
    );

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
    } catch (error: any) {
      if (error?.code === "23505") {
        throw new ConflictException(`Group "${dto.name}" already exists`);
      }
      throw error;
    }
  }

  async update(
    id: string,
    dto: { name?: string; description?: string }
  ): Promise<{ id: string }> {
    const found = await this.db.pg.query<{ id: string; name: string }>(
      "SELECT id, name FROM groups WHERE id = $1",
      [id]
    );
    if (!found.rowCount) {
      throw new NotFoundException("Group not found");
    }
    const previousName = found.rows[0].name;

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
        const affectedExperiments = await this.db.pg.query<{
          id: string;
          segment_rules: { includeGroups?: string[] };
        }>(
          `
          SELECT id, segment_rules
          FROM experiments
          WHERE segment_rules->'includeGroups' ? $1
          `,
          [previousName]
        );

        for (const experiment of affectedExperiments.rows) {
          const includeGroups = experiment.segment_rules?.includeGroups ?? [];
          const updatedIncludeGroups = includeGroups.map((name) =>
            name === previousName ? nextName : name
          );
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
            [JSON.stringify(updatedIncludeGroups), experiment.id]
          );
        }
      }

      return { id };
    } catch (error: any) {
      if (error?.code === "23505") {
        throw new ConflictException(`Group "${dto.name}" already exists`);
      }
      throw error;
    }
  }

  async remove(id: string): Promise<{ ok: true }> {
    await this.db.pg.query("DELETE FROM groups WHERE id = $1", [id]);
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
}
