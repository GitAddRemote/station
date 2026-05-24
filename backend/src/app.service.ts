import { Injectable, Inject, OnModuleDestroy } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

type KeyvLike = { store?: { client?: { quit?(): Promise<void> } } };

@Injectable()
export class AppService implements OnModuleDestroy {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async onModuleDestroy() {
    // cache-manager v7 exposes backing stores via `stores` (Keyv[]).
    // Each Keyv wraps a store adapter whose `.client` is the raw Redis client.
    const stores: KeyvLike[] =
      (this.cacheManager as unknown as { stores?: KeyvLike[] }).stores ?? [];
    for (const keyv of stores) {
      await keyv.store?.client?.quit?.();
    }
  }

  getHello(): string {
    return 'Hello World!';
  }
}
