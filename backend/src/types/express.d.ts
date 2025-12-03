import { Game } from '../modules/games/game.entity';

declare global {
  namespace Express {
    interface Request {
      game?: Game;
    }
  }
}
