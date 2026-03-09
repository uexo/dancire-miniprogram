import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../src/modules/auth/auth.service';
import { PrismaService } from '../src/database/prisma.service';

describe('AuthService', () => {
  let service: AuthService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    userStatistic: {
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('wxLogin', () => {
    it('should login with wx code', async () => {
      const dto = {
        code: 'test-code',
        userInfo: { nickName: 'Test User' },
      };

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 1,
        openid: 'mock_openid_test-code',
        nickname: 'Test User',
      });

      mockPrismaService.user.update.mockResolvedValue({
        id: 1,
        openid: 'mock_openid_test-code',
        nickname: 'Test User',
      });

      const result = await service.wxLogin(dto);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('userInfo');
    });
  });

  describe('generateToken', () => {
    it('should generate JWT token', () => {
      const payload = { userId: 1, openid: 'test' };
      const token = service['generateToken'](payload);
      
      expect(token).toBe('mock-jwt-token');
      expect(mockJwtService.sign).toHaveBeenCalledWith(payload);
    });
  });
});
