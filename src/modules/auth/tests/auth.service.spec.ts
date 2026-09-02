import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserStatus } from 'src/shared/enums/user-type.enum';
import { EncryptionHelper } from 'src/shared/helpers/encryption.helper';
import { User } from '../../users/entities/user.entity';
import { Role } from '../../rbac/entities/role.entity';
import { AuthService } from '../auth.service';
import { RefreshSessionService } from '../refresh-session.service';

describe('AuthService', () => {
  const users = { findOne: jest.fn(), create: jest.fn((v) => v), save: jest.fn() };
  const roles = { findOne: jest.fn() };
  const refreshSessions = { issue: jest.fn(), rotate: jest.fn(), revoke: jest.fn() };
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: users },
        { provide: getRepositoryToken(Role), useValue: roles },
        { provide: JwtService, useValue: { sign: () => 'access.jwt' } },
        {
          provide: ConfigService,
          useValue: { get: (k: string) => (k === 'auth.expires' ? '15m' : undefined) },
        },
        { provide: RefreshSessionService, useValue: refreshSessions },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  it('rejects a duplicate email on register', async () => {
    users.findOne.mockResolvedValue({ id: 'u1' });
    await expect(
      service.register(
        { email: 'a@b.com', password: 'password1', fullName: 'A' },
        {},
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns a token pair on valid login', async () => {
    const password = await EncryptionHelper.hashPassword('password1');
    users.findOne.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      fullName: 'A',
      password,
      status: UserStatus.ACTIVE,
      userType: 'USER',
      roles: [],
    });
    refreshSessions.issue.mockResolvedValue({ token: 'refresh.token', expiresAt: new Date() });

    const result = await service.login(
      { email: 'a@b.com', password: 'password1' },
      {},
    );

    expect(result.accessToken).toBe('access.jwt');
    expect(result.refreshToken).toBe('refresh.token');
    expect(result.user.email).toBe('a@b.com');
  });

  it('rejects a wrong password with the generic message', async () => {
    users.findOne.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      password: await EncryptionHelper.hashPassword('correct'),
      status: UserStatus.ACTIVE,
      roles: [],
    });
    await expect(
      service.login({ email: 'a@b.com', password: 'wrong' }, {}),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
