import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { AuthenticatedAdmin } from "./authenticated-admin";

export const CurrentAdmin = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedAdmin => {
    const request = context.switchToHttp().getRequest<{ user: AuthenticatedAdmin }>();
    return request.user;
  }
);
