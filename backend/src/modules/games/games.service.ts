import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Game } from './game.entity';

@Injectable()
export class GamesService {
  private readonly DEFAULT_GAME_CODE = 'sc';
  private readonly ACTIVE_GAMES_CACHE_KEY = 'games:active';
  private readonly CACHE_TTL = 600000; // 10 minutes

  constructor(
    @InjectRepository(Game)
    private gamesRepository: Repository<Game>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  async getActiveGames(): Promise<Game[]> {
    const cached = await this.cacheManager.get<Game[]>(
      this.ACTIVE_GAMES_CACHE_KEY,
    );
    if (cached) {
      return cached;
    }

    const games = await this.gamesRepository.find({
      where: { active: true },
      order: { name: 'ASC' },
    });

    await this.cacheManager.set(
      this.ACTIVE_GAMES_CACHE_KEY,
      games,
      this.CACHE_TTL,
    );

    return games;
  }

  async getGameByCode(code: string): Promise<Game> {
    const cacheKey = `game:code:${code}`;
    const cached = await this.cacheManager.get<Game>(cacheKey);
    if (cached) {
      return cached;
    }

    const game = await this.gamesRepository.findOne({
      where: { code, active: true },
    });

    if (!game) {
      throw new NotFoundException(`Game with code "${code}" not found`);
    }

    await this.cacheManager.set(cacheKey, game, this.CACHE_TTL);

    return game;
  }

  async getGameById(id: number): Promise<Game> {
    const cacheKey = `game:id:${id}`;
    const cached = await this.cacheManager.get<Game>(cacheKey);
    if (cached) {
      return cached;
    }

    const game = await this.gamesRepository.findOne({
      where: { id },
    });

    if (!game) {
      throw new NotFoundException(`Game with ID ${id} not found`);
    }

    await this.cacheManager.set(cacheKey, game, this.CACHE_TTL);

    return game;
  }

  async getDefaultGame(): Promise<Game> {
    return this.getGameByCode(this.DEFAULT_GAME_CODE);
  }

  async validateGameId(gameId: number): Promise<boolean> {
    try {
      await this.getGameById(gameId);
      return true;
    } catch {
      return false;
    }
  }
}
