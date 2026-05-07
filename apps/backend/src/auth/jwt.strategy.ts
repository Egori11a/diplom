import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { AdminRole } from "./admin-role";
import type { AuthenticatedAdmin } from "./authenticated-admin";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? "local-dev-secret"
    });
  }

  validate(payload: { sub: string; email: string; role: AdminRole }): AuthenticatedAdmin {
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}
