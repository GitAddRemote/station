import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { GamesService } from '../../modules/games/games.service';

@Injectable()
export class GameContextMiddleware implements NestMiddleware {
  constructor(private readonly gamesService: GamesService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const gameCode = req.headers['x-game-code'] as string;

    if (gameCode) {
      try {
        req.game = await this.gamesService.getGameByCode(gameCode);
      } catch {
        req.game = await this.gamesService.getDefaultGame();
      }
    } else {
      req.game = await this.gamesService.getDefaultGame();
    }

    next();
  }
}
