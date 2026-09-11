import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: 'sales' | 'manager';
  title: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: any) => {
          if (req && req.query && req.query.auth_token) {
            return req.query.auth_token;
          }
          if (req && req.headers && req.headers['x-api-key']) {
            return req.headers['x-api-key'];
          }
          return null;
        }
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'koya_enterprise_jwt_secret_2026_secure_key'
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload || !payload.sub || !payload.role) {
      throw new UnauthorizedException('Malformed token payload');
    }
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      title: payload.title
    };
  }
}
