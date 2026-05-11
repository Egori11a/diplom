import { ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RolesGuard } from "./roles.guard";

describe("RolesGuard", () => {
  const makeContext = (role?: "owner" | "admin" | "editor" | "viewer") =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user: role
            ? {
                userId: `${role}-1`,
                email: `${role}@local.test`,
                role
              }
            : undefined
        })
      })
    }) as any;

  it("allows request when route has no role metadata", () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined)
    };
    const guard = new RolesGuard(reflector as unknown as Reflector);

    expect(guard.canActivate(makeContext("viewer"))).toBe(true);
  });

  it("throws when admin credentials are missing", () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(["viewer"])
    };
    const guard = new RolesGuard(reflector as unknown as Reflector);

    expect(() => guard.canActivate(makeContext())).toThrow(ForbiddenException);
  });

  it("allows higher role for lower requirement", () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(["editor"])
    };
    const guard = new RolesGuard(reflector as unknown as Reflector);

    expect(guard.canActivate(makeContext("owner"))).toBe(true);
    expect(guard.canActivate(makeContext("admin"))).toBe(true);
    expect(guard.canActivate(makeContext("editor"))).toBe(true);
  });

  it("rejects insufficient permissions", () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(["admin"])
    };
    const guard = new RolesGuard(reflector as unknown as Reflector);

    expect(() => guard.canActivate(makeContext("viewer"))).toThrow(
      "Insufficient permissions"
    );
    expect(() => guard.canActivate(makeContext("editor"))).toThrow(
      "Insufficient permissions"
    );
  });
});
