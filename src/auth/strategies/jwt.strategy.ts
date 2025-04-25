import { Strategy, StrategyOptionsWithRequest } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private prisma: PrismaService,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: (request: Request) => {
        const cookies = request?.cookies;
        if (!cookies) return null;
        return cookies['Authentication'];
      },
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret'),
      passReqToCallback: true,
    } as StrategyOptionsWithRequest);
  }

  async validate(req: any, payload: any) {
    // Extract token from cookies
    const token = req.cookies?.Authentication;

    if (!token) {
      throw new UnauthorizedException('No authentication cookie found');
    }

    // Check if the token is blacklisted
    const blacklistedToken = await this.prisma.tokenBlacklist.findFirst({
      where: { token },
    });

    if (blacklistedToken) {
      throw new UnauthorizedException();
    }

    // Token is valid, return the payload
    return { userId: payload.sub, username: payload.username };
  }
}
