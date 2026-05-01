import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { OauthClient } from './oauth-client.entity';

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
    return this.repo.save(client);
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
    // Constant-time dummy compare prevents timing-based client enumeration.
    if (!client) {
      await bcrypt.compare(
        secret,
        '$2b$12$dummyhashfordummypurpose000000000000',
      );
      throw new UnauthorizedException('Invalid client credentials');
    }
    const valid = await this.validateSecret(client, secret);
    if (!client.isActive || !valid) {
      throw new UnauthorizedException('Invalid client credentials');
    }
    return client;
  }
}
