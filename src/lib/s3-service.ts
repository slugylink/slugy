import AWS from "aws-sdk";
import CryptoJS from "crypto-js";

export class S3Service {
  private s3: AWS.S3;
  private bucketName: string;

  constructor(bucketName: string) {
    this.bucketName = bucketName;
    this.s3 = new AWS.S3({
      region: process.env.AWS_REGION ?? "ap-south-1",
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      signatureVersion: "v4",
    });
  }

  private generateUniqueId(): string {
    return CryptoJS.lib.WordArray.random(35).toString(CryptoJS.enc.Hex);
  }

  private generateUniqueFileKey(): string {
    const uniqueId = this.generateUniqueId();
    return `uploads/${uniqueId}`;
  }

  async generatePresignedUrl(originalFilename: string, contentType: string) {
    if (!originalFilename || !contentType) {
      throw new Error("Filename and content type are required");
    }

    const uniqueId = this.generateUniqueId();
    const fileKey = `uploads/${uniqueId}`;

    const params = {
      Bucket: this.bucketName,
      Key: fileKey,
      Expires: 3600,
      ContentType: contentType,
      ContentDisposition: `attachment; filename="${originalFilename}"`,
      Metadata: {
        "original-filename": originalFilename,
        "original-name": originalFilename,
      },
    };

    try {
      const signedUrl = await this.s3.getSignedUrlPromise("putObject", params);
      const publicUrl = `https://${this.bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;

      return {
        uploadUrl: signedUrl,
        fileKey: uniqueId,
        filePath: fileKey,
        publicUrl: publicUrl,
      };
    } catch (error) {
      console.error("Error generating presigned URL:", error);
      throw error;
    }
  }

  async getObject(key: string) {
    const params = {
      Bucket: this.bucketName,
      Key: key,
    };

    return this.s3.getObject(params).promise();
  }

  async uploadFile(key: string, buffer: Buffer, contentType: string) {
    const params = {
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    };

    try {
      await this.s3.upload(params).promise();
    } catch (error) {
      console.error("Error uploading file to S3:", error);
      throw error;
    }
  }

  async deleteFile(key: string) {
    const params = {
      Bucket: this.bucketName,
      Key: key,
    };

    try {
      await this.s3.deleteObject(params).promise();
    } catch (error) {
      console.error("Error deleting file from S3:", error);
      throw error;
    }
  }
}

export const s3Service = new S3Service(process.env.AWS_BUCKET_NAME!);
