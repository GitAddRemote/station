import { Injectable, Inject, OnModuleDestroy } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class AppService implements OnModuleDestroy {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async onModuleDestroy() {
    const store = (
      this.cacheManager as unknown as {
        store: { client?: { quit?(): Promise<void> } };
      }
    ).store;
    await store?.client?.quit?.();
  }

  getHello(): string {
    return 'Hello World!';
  }
}
