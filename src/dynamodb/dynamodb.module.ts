import { Module } from '@nestjs/common';
import { DynamoDBService } from './dynamodb.service';
import { TableInitializationService } from './table-initialization.service';

@Module({
  providers: [DynamoDBService, TableInitializationService],
  exports: [DynamoDBService],
})
export class DynamoDBModule {}
