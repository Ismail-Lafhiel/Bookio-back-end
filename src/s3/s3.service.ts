import { Injectable, Logger } from '@nestjs/common';
import { s3Client } from '../config/aws.config';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly bucketName = process.env.AWS_S3_BUCKET_NAME;

  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    const fileKey = `${folder}/${uuidv4()}-${file.originalname}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    try {
      await s3Client.send(command);
      this.logger.log(`File uploaded successfully: ${fileKey}`);
      return `https://${this.bucketName}.s3.amazonaws.com/${fileKey}`;
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error.message}`, error.stack);
      throw new Error('Failed to upload file');
    }
  }
}