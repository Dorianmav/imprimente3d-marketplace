import { AuthGuard } from './auth.guard';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';

describe('AuthGuard', () => {
  it('should be defined', () => {
    const guard = new AuthGuard(
      {} as JwtService,
      {} as Reflector,
    );
    expect(guard).toBeDefined();
  });
});
