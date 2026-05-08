import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type { AuthenticatedAdmin } from "../auth/authenticated-admin";
import { AuditService } from "../audit/audit.service";
import { DbService } from "../db/db.service";
import type { Queryable } from "../db/queryable";
import { UpsertExperimentDto } from "./dto/upsert-experiment.dto";

interface ExperimentRow {
  id: string;
  app_id: string;
  key: string;
  name: string;
  feature_key?: string | null;
  feature_enabled: boolean;
  segment_rules?: Record<string, unknown> | null;
  status: string;
  traffic_percent: number;
  start_at?: string | null;
  end_at?: string | null;
}

interface ActiveExperimentRow {
  id: string;
  key: string;
  featureKey?: string | null;
  featureEnabled: boolean;
  segmentRules?: Record<string, unknown> | null;
  trafficPercent: number;
}

interface ListVariantRow {
  id: string;
  key: string;
  weightPercent: number;
  payload: Record<string, unknown>;
}

interface ActiveVariantRow {
  key: string;
  weightPercent: number;
}

interface ExperimentListView {
  id: string;
  appId: string;
  key: string;
  name: string;
  featureKey: string;
  featureEnabled: boolean;
  segmentRules: Record<string, unknown>;
  status: string;
  trafficPercent: number;
  startAt?: string | null;
  endAt?: string | null;
  variants: ListVariantRow[];
}

interface ActiveExperimentView {
  key: string;
  featureKey: string;
  featureEnabled: boolean;
  segmentRules: Record<string, unknown>;
  trafficPercent: number;
  variants: ActiveVariantRow[];
}

interface ExperimentSnapshot extends ExperimentListView {}

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
export class ExperimentsService {
  constructor(
    private readonly db: DbService,
    private readonly auditService: AuditService
  ) {}

  async list(appId?: string): Promise<{ experiments: ExperimentListView[] }> {
    const experimentsQuery = appId
      ? {
          query: "SELECT * FROM experiments WHERE app_id = $1 ORDER BY created_at DESC",
          params: [appId]
        }
      : {
          query: "SELECT * FROM experiments ORDER BY created_at DESC",
          params: [] as string[]
        };

    const experimentsResult = await this.db.pg.query<ExperimentRow>(
      experimentsQuery.query,
      experimentsQuery.params
    );

    const experiments = await Promise.all(
      experimentsResult.rows.map((row) => this.mapListExperiment(row))
    );

    return { experiments };
  }

  async active(appId: string): Promise<{ experiments: ActiveExperimentView[] }> {
    const result = await this.db.pg.query<ActiveExperimentRow>(
      `SELECT id, key, feature_key AS "featureKey", feature_enabled AS "featureEnabled",
              segment_rules AS "segmentRules", traffic_percent AS "trafficPercent"
       FROM experiments
       WHERE app_id = $1 AND status = 'active'`,
      [appId]
    );

    const experiments = await Promise.all(
      result.rows.map((row) => this.mapActiveExperiment(row))
    );

    return { experiments };
  }

  async create(
    dto: UpsertExperimentDto,
    actor: AuthenticatedAdmin
  ): Promise<{ id: string }> {
    this.validateWeights(dto);

    return this.db.withTransaction(async (queryable) => {
      let exp;
      try {
        exp = await queryable.query<{ id: string }>(
          `
          INSERT INTO experiments (id, app_id, key, name, feature_key, feature_enabled, segment_rules,
                                   status, traffic_percent, start_at, end_at)
          VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10)
          RETURNING id
          `,
          this.buildWriteParams(dto)
        );
      } catch (error: unknown) {
        if (isUniqueViolation(error)) {
          throw new ConflictException(
            `Experiment with key "${dto.key}" already exists for app "${dto.appId}"`
          );
        }
        throw error;
      }

      const id = exp.rows[0].id;
      await this.upsertVariants(id, dto, queryable);
      const created = await this.getExperimentSnapshot(id, queryable);

      await this.auditService.log(
        {
          actor,
          action: "experiment.created",
          entityType: "experiment",
          entityId: created.id,
          entityLabel: created.key,
          afterState: created
        },
        queryable
      );

      return { id };
    });
  }

  async update(
    id: string,
    dto: UpsertExperimentDto,
    actor: AuthenticatedAdmin
  ): Promise<{ id: string }> {
    this.validateWeights(dto);

    return this.db.withTransaction(async (queryable) => {
      const before = await this.getExperimentSnapshot(id, queryable);

      try {
        await queryable.query(
          `
          UPDATE experiments
          SET app_id = $1, key = $2, name = $3, feature_key = $4, feature_enabled = $5,
              segment_rules = $6::jsonb, status = $7, traffic_percent = $8,
              start_at = $9, end_at = $10, updated_at = NOW()
          WHERE id = $11
          `,
          [...this.buildWriteParams(dto), id]
        );
      } catch (error: unknown) {
        if (isUniqueViolation(error)) {
          throw new ConflictException(
            `Experiment with key "${dto.key}" already exists for app "${dto.appId}"`
          );
        }
        throw error;
      }

      await queryable.query("DELETE FROM variants WHERE experiment_id = $1", [id]);
      await this.upsertVariants(id, dto, queryable);
      const after = await this.getExperimentSnapshot(id, queryable);

      await this.auditService.log(
        {
          actor,
          action: "experiment.updated",
          entityType: "experiment",
          entityId: after.id,
          entityLabel: after.key,
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
      const before = await this.getExperimentSnapshot(id, queryable);

      await queryable.query("DELETE FROM experiments WHERE id = $1", [id]);

      await this.auditService.log(
        {
          actor,
          action: "experiment.deleted",
          entityType: "experiment",
          entityId: before.id,
          entityLabel: before.key,
          beforeState: before
        },
        queryable
      );

      return { ok: true };
    });
  }

  private async mapListExperiment(row: ExperimentRow): Promise<ExperimentListView> {
    const variants = await this.fetchListVariants(row.id, this.db.pg);

    return {
      id: row.id,
      appId: row.app_id,
      key: row.key,
      name: row.name,
      featureKey: row.feature_key || row.key,
      featureEnabled: row.feature_enabled,
      segmentRules: row.segment_rules ?? {},
      status: row.status,
      trafficPercent: row.traffic_percent,
      startAt: row.start_at,
      endAt: row.end_at,
      variants
    };
  }

  private async mapActiveExperiment(
    row: ActiveExperimentRow
  ): Promise<ActiveExperimentView> {
    const variants = await this.fetchActiveVariants(row.id, this.db.pg);

    return {
      key: row.key,
      featureKey: row.featureKey || row.key,
      featureEnabled: row.featureEnabled,
      segmentRules: row.segmentRules ?? {},
      trafficPercent: row.trafficPercent,
      variants
    };
  }

  private async fetchListVariants(
    experimentId: string,
    queryable: Queryable
  ): Promise<ListVariantRow[]> {
    const result = await queryable.query<ListVariantRow>(
      `SELECT id, key, weight_percent AS "weightPercent", payload
       FROM variants
       WHERE experiment_id = $1
       ORDER BY key`,
      [experimentId]
    );
    return result.rows;
  }

  private async fetchActiveVariants(
    experimentId: string,
    queryable: Queryable
  ): Promise<ActiveVariantRow[]> {
    const result = await queryable.query<ActiveVariantRow>(
      `SELECT key, weight_percent AS "weightPercent"
       FROM variants
       WHERE experiment_id = $1
       ORDER BY key`,
      [experimentId]
    );
    return result.rows;
  }

  private buildWriteParams(dto: UpsertExperimentDto): unknown[] {
    return [
      dto.appId,
      dto.key,
      dto.name,
      dto.featureKey || dto.key,
      dto.featureEnabled,
      JSON.stringify(dto.segmentRules ?? {}),
      dto.status,
      dto.trafficPercent,
      dto.startAt ?? null,
      dto.endAt ?? null
    ];
  }

  private async getExperimentSnapshot(
    id: string,
    queryable: Queryable
  ): Promise<ExperimentSnapshot> {
    const result = await queryable.query<ExperimentRow>(
      "SELECT * FROM experiments WHERE id = $1",
      [id]
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException("Experiment not found");
    }

    const variants = await this.fetchListVariants(id, queryable);

    return {
      id: row.id,
      appId: row.app_id,
      key: row.key,
      name: row.name,
      featureKey: row.feature_key || row.key,
      featureEnabled: row.feature_enabled,
      segmentRules: row.segment_rules ?? {},
      status: row.status,
      trafficPercent: row.traffic_percent,
      startAt: row.start_at,
      endAt: row.end_at,
      variants
    };
  }

  private validateWeights(dto: UpsertExperimentDto): void {
    if (!dto.variants.length) {
      return;
    }

    const sum = dto.variants.reduce((acc, item) => acc + item.weightPercent, 0);
    if (sum !== 100) {
      throw new BadRequestException("Variant weightPercent sum must be 100");
    }
  }

  private async upsertVariants(
    experimentId: string,
    dto: UpsertExperimentDto,
    queryable: Queryable
  ): Promise<void> {
    for (const variant of dto.variants) {
      await queryable.query(
        `
        INSERT INTO variants (id, experiment_id, key, weight_percent, payload)
        VALUES (gen_random_uuid(), $1, $2, $3, $4::jsonb)
        `,
        [
          experimentId,
          variant.key,
          variant.weightPercent,
          JSON.stringify(variant.payload ?? {})
        ]
      );
    }
  }
}
