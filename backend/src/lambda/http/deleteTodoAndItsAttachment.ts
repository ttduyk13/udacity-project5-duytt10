import 'source-map-support/register'

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import * as middy from 'middy'
import { cors, httpErrorHandler } from 'middy/middlewares'

import { deleteTodoAndItsAttachment } from '../../businessLogic/todos'
import { getUserId } from '../utils'
import { EMPTY_STRING } from '../../utils/constants'

export const handler = middy(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const todoId = event.pathParameters.todoId
    const userId = getUserId(event)
    await deleteTodoAndItsAttachment(todoId, userId)

    return {
      statusCode: 200,
      body: EMPTY_STRING
    }
  }
)

handler.use(httpErrorHandler()).use(
  cors({
    origin: '*',
    credentials: true
  })
)
