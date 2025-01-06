import {
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from '@aws-sdk/client-s3';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class S3Service {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: Logger,
  ) {
    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME');
    this.s3Client = new S3Client({
      region: this.configService.get<string>('AWS_REGION'),
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get<string>(
          'AWS_SECRET_ACCESS_KEY',
        ),
      },
    });
  }

  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    const key = `${folder}/${uuidv4()}-${file.originalname}`;

    try {
      // For files larger than 5MB, use multipart upload
      if (file.size > 5 * 1024 * 1024) {
        return await this.uploadLargeFile(file, key);
      }

      // For smaller files, use regular upload
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      await this.s3Client.send(command);
      return `https://${this.bucketName}.s3.amazonaws.com/${key}`;
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to upload file');
    }
  }

  private async uploadLargeFile(
    file: Express.Multer.File,
    key: string,
  ): Promise<string> {
    try {
      // Initialize multipart upload
      const multipartUpload = await this.s3Client.send(
        new CreateMultipartUploadCommand({
          Bucket: this.bucketName,
          Key: key,
          ContentType: file.mimetype,
        }),
      );

      const uploadId = multipartUpload.UploadId;
      const partSize = 5 * 1024 * 1024; // 5MB parts
      const parts: { ETag: string; PartNumber: number }[] = [];

      // Split file into parts
      for (let i = 0; i < file.buffer.length; i += partSize) {
        const end = Math.min(i + partSize, file.buffer.length);
        const partNumber = Math.floor(i / partSize) + 1;

        const uploadPartCommand = new UploadPartCommand({
          Bucket: this.bucketName,
          Key: key,
          UploadId: uploadId,
          PartNumber: partNumber,
          Body: file.buffer.slice(i, end),
        });

        const response = await this.s3Client.send(uploadPartCommand);
        parts.push({
          ETag: response.ETag!,
          PartNumber: partNumber,
        });
      }

      // Complete multipart upload
      await this.s3Client.send(
        new CompleteMultipartUploadCommand({
          Bucket: this.bucketName,
          Key: key,
          UploadId: uploadId,
          MultipartUpload: { Parts: parts },
        }),
      );

      return `https://${this.bucketName}.s3.amazonaws.com/${key}`;
    } catch (error) {
      this.logger.error(
        `Failed to upload large file: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to upload large file');
    }
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      const key = fileUrl.split('.com/')[1];
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to delete file');
    }
  }
}
