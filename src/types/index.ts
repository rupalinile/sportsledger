import { TokenPayload } from '../utils/jwt';
import { CurrentSubscription } from './subscription.types';
export * from './subscription.types';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      subscription?: CurrentSubscription;
    }
  }
}

export type AuthenticatedUser = TokenPayload;
