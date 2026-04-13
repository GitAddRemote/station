import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';

/**
 * Extends the default ThrottlerGuard to derive the client identifier from the
 * X-Forwarded-For header when the app is deployed behind a reverse proxy or
 * load balancer. Falls back to req.ip when the header is absent (direct
 * connections or local development).
 *
 * Production note: ensure the upstream proxy is trusted so that clients cannot
 * spoof the X-Forwarded-For header (e.g. configure `app.set('trust proxy', 1)`
 * on the underlying Express adapter, or restrict which IPs may set the header
 * at the network level).
 */
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const forwarded = (req as Request).headers['x-forwarded-for'];
    const clientIp = Array.isArray(forwarded)
      ? forwarded[0]?.trim()
      : typeof forwarded === 'string'
        ? forwarded.split(',')[0]?.trim()
        : undefined;
    return clientIp ?? (req as Request).ip ?? 'unknown';
  }
}
