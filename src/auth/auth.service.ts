import { Injectable, UnauthorizedException, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'sales' | 'manager';
  title: string;
  passwordHash?: string;
}

@Injectable()
export class AuthService implements OnModuleInit {
  private users: User[] = [];

  constructor(private readonly jwtService: JwtService) {}

  async onModuleInit() {
    const salesPassword = process.env.SALES_PASSWORD || 'Password123!';
    const managerPassword = process.env.MANAGER_PASSWORD || 'AdminPassword123!';
    const manager2Password = process.env.MANAGER2_PASSWORD || 'AdminPassword123!';

    const salesHash = await bcrypt.hash(salesPassword, 10);
    const managerHash = await bcrypt.hash(managerPassword, 10);
    const manager2Hash = await bcrypt.hash(manager2Password, 10);

    this.users = [
      {
        id: 'usr_sales_01',
        name: 'Sarah Chen',
        email: 'sarah.chen@koyatalent.com',
        role: 'sales',
        title: 'Senior Account Executive',
        passwordHash: salesHash
      },
      {
        id: 'usr_mgr_01',
        name: 'Marcus Vance',
        email: 'marcus.vance@koyatalent.com',
        role: 'manager',
        title: 'Managing Director / Sales VP',
        passwordHash: managerHash
      },
      {
        id: 'usr_mgr_02',
        name: 'Elena Rostova',
        email: 'elena.rostova@koyatalent.com',
        role: 'manager',
        title: 'VP of Operations / Secondary Sign-off Manager',
        passwordHash: manager2Hash
      }
    ];
  }

  async validateUser(email: string, pass: string): Promise<Omit<User, 'passwordHash'>> {
    const user = this.users.find((u) => u.email.toLowerCase() === (email || '').toLowerCase().trim());
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const { passwordHash, ...result } = user;
    return result;
  }

  async login(user: Omit<User, 'passwordHash'>) {
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      title: user.title
    };

    return {
      success: true,
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        title: user.title
      }
    };
  }

  getUsersContext() {
    const isDemo = process.env.DEMO_MODE !== 'false';
    return {
      users: this.users.map(({ passwordHash, ...u }) => u),
      demo_mode: isDemo,
      credentials_hint: isDemo
        ? {
            sales: {
              email: 'sarah.chen@koyatalent.com',
              password: process.env.SALES_PASSWORD || 'Password123!',
              role: 'sales'
            },
            manager: {
              email: 'marcus.vance@koyatalent.com',
              password: process.env.MANAGER_PASSWORD || 'AdminPassword123!',
              role: 'manager'
            },
            manager2: {
              email: 'elena.rostova@koyatalent.com',
              password: process.env.MANAGER2_PASSWORD || 'AdminPassword123!',
              role: 'manager'
            }
          }
        : null
    };
  }
}
