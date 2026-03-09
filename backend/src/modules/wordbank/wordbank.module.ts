// src/modules/wordbank/wordbank.module.ts
import { Module } from '@nestjs/common';
import { WordbankController } from './wordbank.controller';
import { WordbankService } from './wordbank.service';

@Module({
  controllers: [WordbankController],
  providers: [WordbankService],
  exports: [WordbankService],
})
export class WordbankModule {}
