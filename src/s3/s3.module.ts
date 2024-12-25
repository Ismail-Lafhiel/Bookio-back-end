// src/s3/s3.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { S3Service } from './s3.service';
import { Logger } from '@nestjs/common';

@Module({
  imports: [ConfigModule],
  providers: [
    S3Service,
    Logger,
  ],
  exports: [S3Service],
})
export class S3Module {}
