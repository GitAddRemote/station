import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SystemPermissionsGuard } from './system-permissions.guard';
import { User } from '../../users/user.entity';
import { SystemPermission } from '../system-permissions.constants';

describe('SystemPermissionsGuard', () => {
  let guard: SystemPermissionsGuard;
  const userRepo = { findOne: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemPermissionsGuard,
        {
          provide: Reflector,
          useValue: { getAllAndOverride: jest.fn() },
        },
        {
          provide: getRepositoryToken(User),
          useValue: userRepo,
        },
      ],
    }).compile();

    guard = module.get(SystemPermissionsGuard);
    jest.clearAllMocks();
  });

  function ctx(
    userId: string | undefined,
    isSuperAdmin: boolean | null,
  ): ExecutionContext {
    if (userId && isSuperAdmin !== null) {
      userRepo.findOne.mockResolvedValue({ id: userId, isSuperAdmin });
    } else if (userId) {
      userRepo.findOne.mockResolvedValue(null);
    }

    const reflector = guard['reflector'] as jest.Mocked<Reflector>;
    reflector.getAllAndOverride = jest
      .fn()
      .mockReturnValue([
        SystemPermission.CAN_VIEW_STATION_BOT_OPERATOR_CONSOLE,
      ]);

    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user: userId ? { userId } : undefined }),
      }),
    } as unknown as ExecutionContext;
  }

  it('allows super-admin user', async () => {
    const result = await guard.canActivate(ctx('user-1', true));
    expect(result).toBe(true);
  });

  it('throws ForbiddenException for non-super-admin user', async () => {
    await expect(guard.canActivate(ctx('user-2', false))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('throws ForbiddenException when user not found', async () => {
    await expect(guard.canActivate(ctx('user-3', null))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('throws ForbiddenException when userId is absent', async () => {
    const reflector = guard['reflector'] as jest.Mocked<Reflector>;
    reflector.getAllAndOverride = jest
      .fn()
      .mockReturnValue([
        SystemPermission.CAN_VIEW_STATION_BOT_OPERATOR_CONSOLE,
      ]);

    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ user: undefined }) }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('passes through when no system permissions are declared on the route', async () => {
    const reflector = guard['reflector'] as jest.Mocked<Reflector>;
    reflector.getAllAndOverride = jest.fn().mockReturnValue([]);

    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user: { userId: 'user-1' } }),
      }),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(userRepo.findOne).not.toHaveBeenCalled();
  });
});
