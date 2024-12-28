import { CreateTableCommandInput } from '@aws-sdk/client-dynamodb';

export const AuthorsTableDefinition: CreateTableCommandInput = {
  TableName: 'Authors',
  KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
  AttributeDefinitions: [
    { AttributeName: 'id', AttributeType: 'S' },
    { AttributeName: 'name', AttributeType: 'S' },
    { AttributeName: 'nationality', AttributeType: 'S' },
    { AttributeName: 'email', AttributeType: 'S' },
  ],
  GlobalSecondaryIndexes: [
    {
      IndexName: 'NameIndex',
      KeySchema: [{ AttributeName: 'name', KeyType: 'HASH' }],
      Projection: { ProjectionType: 'ALL' },
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      },
    },
    {
      IndexName: 'NationalityIndex',
      KeySchema: [{ AttributeName: 'nationality', KeyType: 'HASH' }],
      Projection: { ProjectionType: 'ALL' },
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      },
    },
    {
      IndexName: 'EmailIndex',
      KeySchema: [{ AttributeName: 'email', KeyType: 'HASH' }],
      Projection: { ProjectionType: 'ALL' },
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      },
    },
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 5,
    WriteCapacityUnits: 5,
  },
};

export const BooksTableDefinition: CreateTableCommandInput = {
  TableName: 'Books',
  KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
  AttributeDefinitions: [
    { AttributeName: 'id', AttributeType: 'S' },
    { AttributeName: 'authorId', AttributeType: 'S' },
    { AttributeName: 'categoryId', AttributeType: 'S' },
    { AttributeName: 'isbn', AttributeType: 'S' },
    { AttributeName: 'status', AttributeType: 'S' },
    { AttributeName: 'title', AttributeType: 'S' },
    { AttributeName: 'cover', AttributeType: 'S' },
    { AttributeName: 'pdf', AttributeType: 'S' },
    { AttributeName: 'borrowerId', AttributeType: 'S' },
  ],
  GlobalSecondaryIndexes: [
    {
      IndexName: 'BorrowerStatusIndex',
      KeySchema: [
        { AttributeName: 'borrowerId', KeyType: 'HASH' },
        { AttributeName: 'status', KeyType: 'RANGE' },
      ],
      Projection: { ProjectionType: 'ALL' },
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      },
    },
    {
      IndexName: 'AuthorIndex',
      KeySchema: [{ AttributeName: 'authorId', KeyType: 'HASH' }],
      Projection: { ProjectionType: 'ALL' },
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      },
    },
    {
      IndexName: 'CategoryIndex',
      KeySchema: [{ AttributeName: 'categoryId', KeyType: 'HASH' }],
      Projection: { ProjectionType: 'ALL' },
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      },
    },
    {
      IndexName: 'ISBNIndex',
      KeySchema: [{ AttributeName: 'isbn', KeyType: 'HASH' }],
      Projection: { ProjectionType: 'ALL' },
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      },
    },
    {
      IndexName: 'StatusIndex',
      KeySchema: [{ AttributeName: 'status', KeyType: 'HASH' }],
      Projection: { ProjectionType: 'ALL' },
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      },
    },
    {
      IndexName: 'TitleIndex',
      KeySchema: [{ AttributeName: 'title', KeyType: 'HASH' }],
      Projection: { ProjectionType: 'ALL' },
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      },
    },
    {
      IndexName: 'CoverIndex',
      KeySchema: [{ AttributeName: 'cover', KeyType: 'HASH' }],
      Projection: { ProjectionType: 'ALL' },
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      },
    },
    {
      IndexName: 'PdfIndex',
      KeySchema: [{ AttributeName: 'pdf', KeyType: 'HASH' }],
      Projection: { ProjectionType: 'ALL' },
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      },
    },
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 5,
    WriteCapacityUnits: 5,
  },
};

export const CategoriesTableDefinition: CreateTableCommandInput = {
  TableName: 'Categories',
  KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
  AttributeDefinitions: [
    { AttributeName: 'id', AttributeType: 'S' },
    { AttributeName: 'name', AttributeType: 'S' },
    { AttributeName: 'createdAt', AttributeType: 'S' },
  ],
  GlobalSecondaryIndexes: [
    {
      IndexName: 'NameIndex',
      KeySchema: [{ AttributeName: 'name', KeyType: 'HASH' }],
      Projection: { ProjectionType: 'ALL' },
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      },
    },
    {
      IndexName: 'CreatedAtIndex',
      KeySchema: [{ AttributeName: 'createdAt', KeyType: 'HASH' }],
      Projection: { ProjectionType: 'ALL' },
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5,
      },
    },
  ],
  ProvisionedThroughput: {
    ReadCapacityUnits: 5,
    WriteCapacityUnits: 5,
  },
};
