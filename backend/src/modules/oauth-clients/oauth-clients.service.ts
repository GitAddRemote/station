import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { OauthClient } from './oauth-client.entity';

// Precomputed hash of the string "dummy" at cost 12. Used only so that
// unknown-client requests pay the same bcrypt cost as real ones, preventing
// timing-based client-ID enumeration.
const DUMMY_HASH =
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeKm6H5.RvBo8JXWi';

@Injectable()
export class OauthClientsService {
  constructor(
    @InjectRepository(OauthClient)
    private readonly repo: Repository<OauthClient>,
  ) {}

  async register(
    clientId: string,
    plainSecret: string,
    scopes: string[],
  ): Promise<OauthClient> {
    const existing = await this.repo.findOne({ where: { clientId } });
    if (existing) {
      throw new ConflictException(`Client '${clientId}' already exists`);
    }
    const clientSecretHash = await bcrypt.hash(plainSecret, 12);
    const client = this.repo.create({ clientId, clientSecretHash, scopes });
    try {
      return await this.repo.save(client);
    } catch (err: unknown) {
      const isUniqueViolation =
        err &&
        typeof err === 'object' &&
        (('code' in err && err.code === '23505') ||
          ('driverError' in err &&
            err.driverError &&
            typeof err.driverError === 'object' &&
            'code' in err.driverError &&
            err.driverError.code === '23505'));
      if (isUniqueViolation) {
        throw new ConflictException(`Client '${clientId}' already exists`);
      }
      throw new InternalServerErrorException('Failed to register client');
    }
  }

  async findByClientId(clientId: string): Promise<OauthClient | null> {
    return this.repo.findOne({ where: { clientId } });
  }

  async validateSecret(client: OauthClient, secret: string): Promise<boolean> {
    return bcrypt.compare(secret, client.clientSecretHash);
  }

  /** Validate credentials end-to-end; throws 401 on any failure. */
  async validateClient(clientId: string, secret: string): Promise<OauthClient> {
    const client = await this.findByClientId(clientId);

    // Always run a bcrypt compare — against the real hash when the client exists,
    // against a dummy hash otherwise — so request timing cannot reveal whether a
    // client_id is registered or inactive.
    const hashToCompare = client ? client.clientSecretHash : DUMMY_HASH;
    let secretValid = false;
    try {
      secretValid = await bcrypt.compare(secret, hashToCompare);
    } catch {
      // Treat a malformed hash the same as a wrong secret.
    }

    if (!client || !client.isActive || !secretValid) {
      throw new UnauthorizedException('Invalid client credentials');
    }

    return client;
  }
}
