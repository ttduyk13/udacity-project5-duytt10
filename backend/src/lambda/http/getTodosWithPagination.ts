import 'source-map-support/register'

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import * as middy from 'middy'
import { cors, httpErrorHandler } from 'middy/middlewares'
import { getTodosByUserIdWithPagination } from '../../businessLogic/todos'
import { getUserId, parseLimitParameter } from '../utils'

export const handler = middy(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const userId: string = getUserId(event)
    const limit: number = parseLimitParameter(event)
    const todos = await getTodosByUserIdWithPagination(userId, limit)

    return {
      statusCode: 200,
      body: JSON.stringify(todos)
    }
  }
)

handler.use(httpErrorHandler()).use(
  cors({
    origin: '*',
    credentials: true
  })
)
