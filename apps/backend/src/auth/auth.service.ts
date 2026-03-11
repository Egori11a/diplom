import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { DbService } from "../db/db.service";

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
      password: string;
    }>("SELECT id, email, password FROM admins WHERE email = $1", [email]);

    const admin = result.rows[0];
    if (!admin || admin.password !== password) {
      return null;
    }

    return this.jwt.sign({ sub: admin.id, email: admin.email, role: "admin" });
  }
}
