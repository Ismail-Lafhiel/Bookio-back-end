import { Module } from '@nestjs/common';
import { BooksService } from './books.service';
import { BooksController } from './books.controller';
import { DynamoDBModule } from '../dynamodb/dynamodb.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DynamoDBModule, AuthModule],
  controllers: [BooksController],
  providers: [BooksService],
  exports: [BooksService],
})
export class BooksModule {}