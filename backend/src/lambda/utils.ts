import { APIGatewayProxyEvent } from 'aws-lambda'
import { parseUserId } from '../auth/utils'
import { createLogger } from '../utils/logger'
import * as createError from 'http-errors'

const logger = createLogger('utils')

const getUserId = (event: APIGatewayProxyEvent): string => {
  const authorization = event.headers.Authorization
  const split = authorization.split(' ')
  const jwtToken = split[1]

  return parseUserId(jwtToken)
}

const parseLimitParameter = (event: APIGatewayProxyEvent): number => {
  try {
    let limit = event?.queryStringParameters?.limit
    return (isNaN(Number(limit)) ? null : parseInt(limit)) ?? 5
  } catch (error) {
    logger.info(`Error when #parseLimitParameter: `, error)
    createError(400, JSON.stringify({
      message: 'Invalid parameter',
      error: error
    }))
  }
}

export { getUserId, parseLimitParameter }
