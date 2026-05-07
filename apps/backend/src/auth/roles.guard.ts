import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { AuthenticatedAdmin } from "./authenticated-admin";
import { ROLES_METADATA_KEY } from "./roles.decorator";
import type { AdminRole } from "./admin-role";

const roleWeight: Record<AdminRole, number> = {
  owner: 4,
  admin: 3,
  editor: 2,
  viewer: 1
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AdminRole[]>(
      ROLES_METADATA_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedAdmin }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException("Admin credentials are required");
    }

    const minRequiredWeight = Math.min(...requiredRoles.map((role) => roleWeight[role]));
    if (roleWeight[user.role] < minRequiredWeight) {
      throw new ForbiddenException("Insufficient permissions");
    }

    return true;
  }
}
