import AWS from "aws-sdk";
import CryptoJS from "crypto-js";

export class S3Service {
  private s3: AWS.S3;
  private bucketName: string;
  private accountId: string;

  constructor(bucketName: string) {
    if (!bucketName) {
      throw new Error("Bucket name is required for S3Service");
    }
    
    this.bucketName = bucketName;
    this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID!;
    
    if (!this.accountId) {
      throw new Error("CLOUDFLARE_ACCOUNT_ID environment variable is required");
    }
    
    if (!process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || !process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY) {
      throw new Error("CLOUDFLARE_R2_ACCESS_KEY_ID and CLOUDFLARE_R2_SECRET_ACCESS_KEY environment variables are required");
    }
    
    this.s3 = new AWS.S3({
      region: "auto", // Cloudflare R2 uses "auto" region
      endpoint: `https://${this.accountId}.r2.cloudflarestorage.com`,
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
      signatureVersion: "v4",
      s3ForcePathStyle: true, // Required for R2
    });
  }

  private generateUniqueId(): string {
    return CryptoJS.lib.WordArray.random(35).toString(CryptoJS.enc.Hex);
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
      // Use Cloudflare R2 public URL format
      const publicUrl = `https://pub-${this.bucketName}.r2.dev/${fileKey}`;

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

// Initialize S3Service with proper error handling
const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;
if (!bucketName) {
  console.error("CLOUDFLARE_R2_BUCKET_NAME environment variable is not set");
  throw new Error("CLOUDFLARE_R2_BUCKET_NAME environment variable is required");
}

export const s3Service = new S3Service(bucketName);
