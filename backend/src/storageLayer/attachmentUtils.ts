import * as AWS from 'aws-sdk'
import {S3} from 'aws-sdk'
import { createLogger } from '../utils/logger'

const logger = createLogger('S3Storage')
export class S3Storage {
    constructor(
        private readonly s3: S3 = new AWS.S3({signatureVersion: 'v4'}),
        private readonly bucketName = process.env.ATTACHMENT_S3_BUCKET,
        private readonly urlExpiration = process.env.SIGNED_URL_EXPIRATION
    ) {
    }

    private defaultUrlExpiration: number = 300

    getBucketName = (): string => {
        return this.bucketName
    }


    getUploadUrl = (todoId: string, userId: string): string => {
        const params = {
            Bucket: this.bucketName,
            Key: `${userId}-${todoId}.png`,
            Expires: Number.isInteger(this.urlExpiration)
                ? parseInt(this.urlExpiration)
                : this.defaultUrlExpiration
        }
        return this.s3.getSignedUrl('putObject', params)
    }

    deleteAttachment = async (todoId: string, userId: string): Promise<void> => {

        const params = {
            Bucket: this.bucketName,
            Key: `${userId}-${todoId}.png`,
        }
        try {
            await this.s3.headObject(params).promise();
            await this.s3.deleteObject(params).promise();
            logger.info(`File ${params.Key} deleted`)
        } catch (e) {
            if (e.statusCode === 404) {
                logger.info(`File ${params.Key} not found`);
            } else {
                logger.error("Exception: ", e)
            }
        }
    }
}
