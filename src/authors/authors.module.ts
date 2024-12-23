import { Module } from '@nestjs/common';
import { AuthorsService } from './authors.service';
import { AuthorsController } from './authors.controller';
import { DynamoDBModule } from 'src/dynamodb/dynamodb.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [DynamoDBModule, AuthModule],
  controllers: [AuthorsController],
  providers: [AuthorsService],
  exports: [AuthorsService],
})
export class AuthorsModule {}
