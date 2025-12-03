import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentGame = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.game;
  },
);

export const CurrentGameId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.game?.id;
  },
);
