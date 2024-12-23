import { Injectable, OnModuleInit } from '@nestjs/common';
import { DynamoDBService } from './dynamodb.service';
import { CreateTableCommand } from '@aws-sdk/client-dynamodb';
import {
  AuthorsTableDefinition,
  BooksTableDefinition,
  CategoriesTableDefinition,
} from './table-definitions';

@Injectable()
export class TableInitializationService implements OnModuleInit {
  constructor(private readonly dynamoDBService: DynamoDBService) {}

  async onModuleInit() {
    await this.initializeTables();
  }

  private async initializeTables() {
    try {
      await this.createTableIfNotExists(AuthorsTableDefinition);
      await this.createTableIfNotExists(BooksTableDefinition);
      await this.createTableIfNotExists(CategoriesTableDefinition);
      console.log('All tables initialized successfully');
    } catch (error) {
      console.error('Error initializing tables:', error);
      throw error;
    }
  }

  private async createTableIfNotExists(tableDefinition: any) {
    try {
      const command = new CreateTableCommand(tableDefinition);
      await this.dynamoDBService.ddbClient.send(command);
      console.log(`Table ${tableDefinition.TableName} created successfully`);
    } catch (error) {
      if (error.name === 'ResourceInUseException') {
        console.log(`Table ${tableDefinition.TableName} already exists`);
      } else {
        throw error;
      }
    }
  }
}
