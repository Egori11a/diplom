import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { createClient, type ClickHouseClient } from "@clickhouse/client";
import { Pool } from "pg";

@Injectable()
export class DbService implements OnModuleDestroy {
  readonly pg: Pool;
  readonly clickhouse: ClickHouseClient;

  constructor() {
    this.pg = new Pool({
      connectionString:
        process.env.POSTGRES_URL ??
        "postgres://postgres:postgres@localhost:5432/ab_platform"
    });

    this.clickhouse = createClient({
      url: process.env.CLICKHOUSE_URL ?? "http://localhost:8123",
      username: process.env.CLICKHOUSE_USER ?? "default",
      password: process.env.CLICKHOUSE_PASSWORD ?? ""
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.pg.end();
    await this.clickhouse.close();
  }

  async ensureSchema(): Promise<void> {
    await this.pg.query("CREATE EXTENSION IF NOT EXISTS pgcrypto;");

    await this.pg.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id UUID PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS experiments (
        id UUID PRIMARY KEY,
        app_id TEXT NOT NULL,
        key TEXT NOT NULL,
        name TEXT NOT NULL,
        feature_key TEXT NOT NULL,
        feature_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        segment_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
        status TEXT NOT NULL,
        traffic_percent INT NOT NULL,
        start_at TIMESTAMPTZ,
        end_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (app_id, key)
      );

      CREATE TABLE IF NOT EXISTS variants (
        id UUID PRIMARY KEY,
        experiment_id UUID NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
        key TEXT NOT NULL,
        weight_percent INT NOT NULL,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        UNIQUE (experiment_id, key)
      );

      CREATE TABLE IF NOT EXISTS groups (
        id UUID PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS group_members (
        id UUID PRIMARY KEY,
        group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        member_key TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (group_id, member_key)
      );
    `);

    await this.pg.query(`
      ALTER TABLE experiments
      ADD COLUMN IF NOT EXISTS feature_key TEXT NOT NULL DEFAULT '';

      ALTER TABLE experiments
      ADD COLUMN IF NOT EXISTS feature_enabled BOOLEAN NOT NULL DEFAULT TRUE;

      ALTER TABLE experiments
      ADD COLUMN IF NOT EXISTS segment_rules JSONB NOT NULL DEFAULT '{}'::jsonb;
    `);

    await this.clickhouse.command({
      query: `
        CREATE TABLE IF NOT EXISTS events (
          event_id String,
          app_id String,
          anonymous_id String,
          experiment_key String,
          variant_key String,
          type String,
          ts DateTime64(3),
          meta String
        ) ENGINE = MergeTree
        ORDER BY (experiment_key, ts, event_id)
      `
    });

    await this.seedAdmin();
  }

  private async seedAdmin(): Promise<void> {
    const email = process.env.ADMIN_EMAIL ?? "admin@local.test";
    const password = process.env.ADMIN_PASSWORD ?? "admin123";

    await this.pg.query(
      `
      INSERT INTO admins (id, email, password)
      VALUES (gen_random_uuid(), $1, $2)
      ON CONFLICT (email) DO NOTHING
      `,
      [email, password]
    );
  }
}
