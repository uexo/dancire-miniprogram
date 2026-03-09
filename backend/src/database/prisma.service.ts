import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(private configService: ConfigService) {
    const useSqlite = configService.get<boolean>('USE_SQLITE', false);
    
    if (useSqlite) {
      // SQLite 模式
      const sqlitePath = configService.get<string>('SQLITE_PATH', './wordheat.sqlite');
      super({
        datasources: {
          db: {
            url: `file:${sqlitePath}`,
          },
        },
      });
    } else {
      // MySQL 模式
      const host = configService.get<string>('DB_HOST', 'localhost');
      const port = configService.get<number>('DB_PORT', 3306);
      const user = configService.get<string>('DB_USER', 'root');
      const password = configService.get<string>('DB_PASSWORD', '');
      const database = configService.get<string>('DB_NAME', 'wordheat');
      
      super({
        datasources: {
          db: {
            url: `mysql://${user}:${password}@${host}:${port}/${database}`,
          },
        },
      });
    }
  }

  async onModuleInit() {
    await this.$connect();
    console.log('✅ Database connected successfully');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log('👋 Database disconnected');
  }
}