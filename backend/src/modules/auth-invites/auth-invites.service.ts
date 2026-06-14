import * as crypto from 'crypto';
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { AuthInvite } from '../auth/auth-invite.entity';

@Injectable()
export class AuthInvitesService {
  constructor(
    @InjectRepository(AuthInvite)
    private readonly inviteRepo: Repository<AuthInvite>,
    private readonly dataSource: DataSource,
  ) {}

  isInviteOnly(): boolean {
    return process.env['AUTH_INVITE_ONLY'] === 'true';
  }

  async generateInvite(
    createdByUserId: string,
    expiresInDays = 7,
  ): Promise<AuthInvite> {
    const token = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date(
      Date.now() + expiresInDays * 24 * 60 * 60 * 1000,
    );
    const invite = this.inviteRepo.create({
      token,
      createdById: createdByUserId,
      expiresAt,
      usedAt: null,
      usedById: null,
      revoked: false,
    });
    return this.inviteRepo.save(invite);
  }

  async validateToken(token: string): Promise<AuthInvite> {
    const invite = await this.inviteRepo.findOne({ where: { token } });
    if (
      !invite ||
      invite.revoked ||
      invite.usedAt !== null ||
      invite.expiresAt < new Date()
    ) {
      throw new NotFoundException('Invalid or expired invite');
    }
    return invite;
  }

  async consumeToken(token: string, usedByUserId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const invite = await manager
        .getRepository(AuthInvite)
        .findOne({ where: { token }, lock: { mode: 'pessimistic_write' } });

      if (
        !invite ||
        invite.revoked ||
        invite.usedAt !== null ||
        invite.expiresAt < new Date()
      ) {
        throw new NotFoundException('Invalid or expired invite');
      }

      if (invite.usedAt !== null) {
        throw new ConflictException('Invite has already been used');
      }

      invite.usedAt = new Date();
      invite.usedById = usedByUserId;
      await manager.getRepository(AuthInvite).save(invite);
    });
  }

  async revokeInvite(id: string): Promise<void> {
    const invite = await this.inviteRepo.findOne({ where: { id } });
    if (!invite || invite.usedAt !== null) {
      throw new NotFoundException('Invite not found or already used');
    }
    invite.revoked = true;
    await this.inviteRepo.save(invite);
  }

  async listInvites(): Promise<AuthInvite[]> {
    return this.inviteRepo.find({ order: { createdAt: 'DESC' } });
  }
}
