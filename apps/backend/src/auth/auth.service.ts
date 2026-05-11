import { Injectable } from "@nestjs/common";
import { compare, hash } from "bcryptjs";
import { JwtService } from "@nestjs/jwt";
import { DbService } from "../db/db.service";
import type { AdminRole } from "./admin-role";

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DbService,
    private readonly jwt: JwtService
  ) {}

  async login(email: string, password: string): Promise<string | null> {
    const result = await this.db.pg.query<{
      id: string;
      email: string;
      password: string | null;
      password_hash: string | null;
      role: AdminRole;
      is_active: boolean;
    }>(
      `
      SELECT id, email, password, password_hash, role, is_active
      FROM admins
      WHERE email = $1
      `,
      [email]
    );

    const admin = result.rows[0];
    if (!admin || !admin.is_active) {
      return null;
    }

    const isValid = await this.verifyPassword(admin, password);
    if (!isValid) {
      return null;
    }

    await this.db.pg.query(
      `
      UPDATE admins
      SET last_login_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
      `,
      [admin.id]
    );

    return this.jwt.sign({ sub: admin.id, email: admin.email, role: admin.role });
  }

  private async verifyPassword(
    admin: {
      id: string;
      password: string | null;
      password_hash: string | null;
    },
    password: string
  ): Promise<boolean> {
    if (admin.password_hash) {
      return compare(password, admin.password_hash);
    }

    if (!admin.password || admin.password !== password) {
      return false;
    }

    const passwordHash = await hash(password, 12);
    await this.db.pg.query(
      `
      UPDATE admins
      SET password_hash = $1,
          password = NULL,
          updated_at = NOW()
      WHERE id = $2
      `,
      [passwordHash, admin.id]
    );

    return true;
  }
}
