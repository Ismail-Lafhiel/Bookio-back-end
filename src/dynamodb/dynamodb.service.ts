import { Injectable } from '@nestjs/common';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

@Injectable()
export class DynamoDBService {
  public readonly ddbClient: DynamoDBClient;
  public readonly documentClient: DynamoDBDocumentClient;

  constructor() {
    this.ddbClient = new DynamoDBClient({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    this.documentClient = DynamoDBDocumentClient.from(this.ddbClient, {
      marshallOptions: {
        // Convert empty strings, blobs, and sets to null
        convertEmptyValues: true,
        // Remove undefined values
        removeUndefinedValues: true,
        // Convert typeof object to map attribute
        convertClassInstanceToMap: true,
      },
    });
  }
}
