import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { jwtConstants } from '../../config/jwt.config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConstants.secret,
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: any) {
    const token = req.headers?.authorization?.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Invalid token');
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
