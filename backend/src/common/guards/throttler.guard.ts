import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';

/**
 * Extends the default ThrottlerGuard to derive the client IP from the
 * IP address resolved by Express. When the app is deployed behind a trusted
 * reverse proxy or load balancer, Express populates `req.ips`; otherwise this
 * falls back to `req.ip` for direct connections or local development.
 *
 * Production note: configure proxy trust correctly on the underlying Express
 * adapter (for example, `app.set('trust proxy', 1)`) so forwarded addresses
 * are only used when supplied by trusted infrastructure. Reading the raw
 * X-Forwarded-For header directly is avoided here because it can be spoofed
 * by any client that reaches the app without passing through the proxy.
 */
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const request = req as unknown as Request;
    // req.ips is populated by Express only when trust proxy is configured;
    // it contains the full chain of forwarded IPs with spoofed entries stripped.
    // Fall back to req.ip (the direct connection address) when not behind a proxy.
    const clientIp = request.ips?.length ? request.ips[0] : request.ip;
    return clientIp ?? 'unknown';
  }
}
