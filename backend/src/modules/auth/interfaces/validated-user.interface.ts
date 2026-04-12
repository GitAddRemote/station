import { User } from '../../users/user.entity';

/**
 * User returned from validateUser (without password)
 */
export type ValidatedUser = Omit<User, 'password'>;
