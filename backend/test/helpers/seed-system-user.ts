import { DataSource } from 'typeorm';
import { User } from '../../src/modules/users/user.entity';
import * as bcrypt from 'bcrypt';

export async function seedSystemUser(dataSource: DataSource): Promise<User> {
  const userRepository = dataSource.getRepository(User);

  // Check if system user already exists
  const existingSystemUser = await userRepository.findOne({
    where: { id: 1, isSystemUser: true },
  });

  if (existingSystemUser) {
    return existingSystemUser;
  }

  // Create system user with unusable password
  const unusablePassword = await bcrypt.hash(
    'SYSTEM_USER_NO_LOGIN_' + Math.random(),
    10,
  );

  const systemUser = userRepository.create({
    id: 1,
    username: 'station-system',
    email: 'system@station.internal',
    password: unusablePassword,
    isActive: true,
    isSystemUser: true,
  });

  return await userRepository.save(systemUser);
}
