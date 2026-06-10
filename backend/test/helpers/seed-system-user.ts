import { DataSource } from 'typeorm';
import { User } from '../../src/modules/users/user.entity';
import * as bcrypt from 'bcrypt';

export async function seedSystemUser(dataSource: DataSource): Promise<User> {
  const userRepository = dataSource.getRepository(User);

  const existingSystemUser = await userRepository.findOne({
    where: { username: 'station-system', isSystemUser: true },
  });

  if (existingSystemUser) {
    return existingSystemUser;
  }

  const unusablePassword = await bcrypt.hash(
    'SYSTEM_USER_NO_LOGIN_' + Math.random(),
    10,
  );

  const systemUser = userRepository.create({
    username: 'station-system',
    email: 'system@station.internal',
    password: unusablePassword,
    isActive: true,
    isSystemUser: true,
  });

  return await userRepository.save(systemUser);
}
