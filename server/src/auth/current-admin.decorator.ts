import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** The admin resolved by JwtStrategy.validate - used to stamp updatedById. */
export const CurrentAdmin = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  return ctx.switchToHttp().getRequest().user as { id: string; email: string; name: string };
});
