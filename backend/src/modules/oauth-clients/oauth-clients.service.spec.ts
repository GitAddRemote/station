import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { OauthClientsService } from './oauth-clients.service';
import { OauthClient } from './oauth-client.entity';
import * as bcrypt from 'bcrypt';

const makeClient = (overrides: Partial<OauthClient> = {}): OauthClient =>
  Object.assign(new OauthClient(), {
    id: 'uuid-1',
    clientId: 'station-bot',
    clientSecretHash: '',
    scopes: ['bot:api'],
    isActive: true,
    createdAt: new Date(),
    ...overrides,
  });

describe('OauthClientsService', () => {
  let service: OauthClientsService;
  const repo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OauthClientsService,
        { provide: getRepositoryToken(OauthClient), useValue: repo },
      ],
    }).compile();

    service = module.get(OauthClientsService);
  });

  describe('register', () => {
    it('creates a new client with a bcrypt-hashed secret', async () => {
      repo.findOne.mockResolvedValue(null);
      const client = makeClient();
      repo.create.mockReturnValue(client);
      repo.save.mockResolvedValue(client);

      await service.register('station-bot', 'plaintext-secret-value', [
        'bot:api',
      ]);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: 'station-bot',
          scopes: ['bot:api'],
        }),
      );
      const savedArg = repo.create.mock.calls[0][0] as OauthClient;
      expect(savedArg.clientSecretHash).not.toBe('plaintext-secret-value');
      const matches = await bcrypt.compare(
        'plaintext-secret-value',
        savedArg.clientSecretHash,
      );
      expect(matches).toBe(true);
    });

    it('throws ConflictException when clientId already exists', async () => {
      repo.findOne.mockResolvedValue(makeClient());
      await expect(
        service.register('station-bot', 'secret', ['bot:api']),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('validateSecret', () => {
    it('returns true for the correct secret', async () => {
      const hash = await bcrypt.hash('correct-secret', 12);
      const client = makeClient({ clientSecretHash: hash });
      await expect(
        service.validateSecret(client, 'correct-secret'),
      ).resolves.toBe(true);
    });

    it('returns false for an incorrect secret', async () => {
      const hash = await bcrypt.hash('correct-secret', 12);
      const client = makeClient({ clientSecretHash: hash });
      await expect(
        service.validateSecret(client, 'wrong-secret'),
      ).resolves.toBe(false);
    });
  });

  describe('validateClient', () => {
    it('returns the client on valid credentials', async () => {
      const hash = await bcrypt.hash('my-secret', 12);
      const client = makeClient({ clientSecretHash: hash });
      repo.findOne.mockResolvedValue(client);
      await expect(
        service.validateClient('station-bot', 'my-secret'),
      ).resolves.toBe(client);
    });

    it('throws UnauthorizedException when client not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.validateClient('unknown', 'secret')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when client is inactive', async () => {
      const hash = await bcrypt.hash('secret', 12);
      repo.findOne.mockResolvedValue(
        makeClient({ isActive: false, clientSecretHash: hash }),
      );
      await expect(
        service.validateClient('station-bot', 'secret'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for wrong secret', async () => {
      const hash = await bcrypt.hash('correct', 12);
      repo.findOne.mockResolvedValue(makeClient({ clientSecretHash: hash }));
      await expect(
        service.validateClient('station-bot', 'wrong'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
