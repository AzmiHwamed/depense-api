import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from 'src/user/entities/user.entity';

// Assumes your Firebase auth guard attaches the resolved `User` entity
// to `req.user`. Adjust the property name if your guard uses something else.
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
