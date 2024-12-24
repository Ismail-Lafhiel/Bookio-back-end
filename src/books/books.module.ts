import { Module } from '@nestjs/common';
import { BooksService } from './books.service';
import { BooksController } from './books.controller';
import { DynamoDBModule } from '../dynamodb/dynamodb.module';
import { AuthModule } from '../auth/auth.module';
import { S3Module } from 'src/s3/s3.module';

@Module({
  imports: [DynamoDBModule, AuthModule, S3Module],
  controllers: [BooksController],
  providers: [BooksService],
  exports: [BooksService],
})
export class BooksModule {}