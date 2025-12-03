import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { GamesService } from '../src/modules/games/games.service';
import { Game } from '../src/modules/games/game.entity';
import { DatabaseSeederService } from '../src/database/seeds/database-seeder.service';

describe('Games (e2e)', () => {
  let app: INestApplication;
  let gamesService: GamesService;
  let starCitizen: Game;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Seed the database
    const seeder = moduleFixture.get<DatabaseSeederService>(
      DatabaseSeederService,
    );
    await seeder.seedAll();

    gamesService = moduleFixture.get<GamesService>(GamesService);

    // Verify seed data exists
    const games = await gamesService.getActiveGames();
    starCitizen = games.find((g) => g.code === 'sc')!;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GamesService', () => {
    describe('getActiveGames', () => {
      it('should return all active games', async () => {
        const games = await gamesService.getActiveGames();

        expect(games).toBeDefined();
        expect(games.length).toBeGreaterThanOrEqual(2);
        expect(games.every((g) => g.active)).toBe(true);
      });

      it('should include Star Citizen', async () => {
        const games = await gamesService.getActiveGames();
        const sc = games.find((g) => g.code === 'sc');

        expect(sc).toBeDefined();
        expect(sc!.name).toBe('Star Citizen');
        expect(sc!.active).toBe(true);
      });

      it('should include Squadron 42', async () => {
        const games = await gamesService.getActiveGames();
        const sq42 = games.find((g) => g.code === 'sq42');

        expect(sq42).toBeDefined();
        expect(sq42!.name).toBe('Squadron 42');
        expect(sq42!.active).toBe(true);
      });

      it('should cache results', async () => {
        const firstCall = await gamesService.getActiveGames();
        const secondCall = await gamesService.getActiveGames();

        expect(firstCall).toEqual(secondCall);
      });
    });

    describe('getGameByCode', () => {
      it('should return game by code "sc"', async () => {
        const game = await gamesService.getGameByCode('sc');

        expect(game).toBeDefined();
        expect(game.code).toBe('sc');
        expect(game.name).toBe('Star Citizen');
      });

      it('should return game by code "sq42"', async () => {
        const game = await gamesService.getGameByCode('sq42');

        expect(game).toBeDefined();
        expect(game.code).toBe('sq42');
        expect(game.name).toBe('Squadron 42');
      });

      it('should throw NotFoundException for invalid code', async () => {
        await expect(gamesService.getGameByCode('invalid')).rejects.toThrow(
          'Game with code "invalid" not found',
        );
      });

      it('should cache results', async () => {
        const firstCall = await gamesService.getGameByCode('sc');
        const secondCall = await gamesService.getGameByCode('sc');

        expect(firstCall).toEqual(secondCall);
      });
    });

    describe('getGameById', () => {
      it('should return game by ID', async () => {
        const game = await gamesService.getGameById(starCitizen.id);

        expect(game).toBeDefined();
        expect(game.id).toBe(starCitizen.id);
        expect(game.code).toBe('sc');
      });

      it('should throw NotFoundException for invalid ID', async () => {
        await expect(gamesService.getGameById(99999)).rejects.toThrow(
          'Game with ID 99999 not found',
        );
      });
    });

    describe('getDefaultGame', () => {
      it('should return Star Citizen as default', async () => {
        const game = await gamesService.getDefaultGame();

        expect(game).toBeDefined();
        expect(game.code).toBe('sc');
        expect(game.name).toBe('Star Citizen');
      });
    });

    describe('validateGameId', () => {
      it('should return true for valid game ID', async () => {
        const isValid = await gamesService.validateGameId(starCitizen.id);
        expect(isValid).toBe(true);
      });

      it('should return false for invalid game ID', async () => {
        const isValid = await gamesService.validateGameId(99999);
        expect(isValid).toBe(false);
      });
    });
  });

  describe('Game Entity', () => {
    it('should have correct structure for Star Citizen', () => {
      expect(starCitizen).toHaveProperty('id');
      expect(starCitizen).toHaveProperty('name');
      expect(starCitizen).toHaveProperty('code');
      expect(starCitizen).toHaveProperty('description');
      expect(starCitizen).toHaveProperty('active');
      expect(starCitizen).toHaveProperty('createdAt');
      expect(starCitizen).toHaveProperty('updatedAt');
    });

    it('should have unique codes', async () => {
      const games = await gamesService.getActiveGames();
      const codes = games.map((g) => g.code);
      const uniqueCodes = new Set(codes);

      expect(codes.length).toBe(uniqueCodes.size);
    });

    it('should have non-null required fields', () => {
      expect(starCitizen.name).toBeTruthy();
      expect(starCitizen.code).toBeTruthy();
      expect(typeof starCitizen.active).toBe('boolean');
    });
  });
});
