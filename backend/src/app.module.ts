// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// 业务模块
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { WordsModule } from './modules/words/words.module';
import { WordbankModule } from './modules/wordbank/wordbank.module';
import { CheckinModule } from './modules/checkin/checkin.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentModule } from './modules/payment/payment.module';
import { ReportsModule } from './modules/reports/reports.module';
import { TtsModule } from './modules/tts/tts.module';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../backend/.env'],
    }),

    // 业务模块
    AuthModule,
    UsersModule,
    WordsModule,
    WordbankModule,
    CheckinModule,
    OrdersModule,
    PaymentModule,
    ReportsModule,
    TtsModule,
  ],
})
export class AppModule {}
