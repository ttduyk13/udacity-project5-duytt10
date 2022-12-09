import * as AWS from 'aws-sdk'
import { S3 } from 'aws-sdk'
import { createLogger } from '../utils/logger'
import * as createError from 'http-errors'

const logger = createLogger('S3Storage')

export class S3Storage {
  private defaultUrlExpiration: number = 300

  constructor(
    private readonly s3: S3 = new AWS.S3({ signatureVersion: 'v4' }),
    private readonly bucketName = process.env.ATTACHMENT_S3_BUCKET,
    private readonly urlExpiration = process.env.SIGNED_URL_EXPIRATION
  ) {
  }

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
      Key: `${userId}-${todoId}.png`
    }
    try {
      await this.s3.getObject(params).promise()
      console.log('File existed')
      try {
        await this.s3.deleteObject(params).promise()
        logger.info(`File ${params.Key} deleted`)
      } catch (e) {
        logger.error('Exception: ', e)
        createError(400, JSON.stringify(e))
      }
    } catch (e) {
      if (e.statusCode === 404) {
        logger.info(`File ${params.Key} not found`)
        createError(400, {
          message: `File ${params.Key} not found`
        })
      } else {
        logger.error('Exception: ', e)
        createError(400, JSON.stringify(e))
      }
    }
  }
}
