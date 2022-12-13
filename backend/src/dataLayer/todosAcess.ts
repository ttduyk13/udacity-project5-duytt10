import * as AWS from 'aws-sdk'
import { DocumentClient } from 'aws-sdk/clients/dynamodb'
import { TodoItem } from '../models/TodoItem'
import { TodoUpdate } from '../models/TodoUpdate'
import { createLogger } from '../utils/logger'
import { ItemsWithPage } from '../models/ItemsWithPage'
import { TodoPagination } from '../models/TodoPagination'

const AWSXRay = require('aws-xray-sdk')
const logger = createLogger('TodosAccess')

const XAWS = AWSXRay.captureAWS(AWS)

export class TodosAccess {
  private currentUserId: string = null
  private shouldFetch: boolean = false
  private datas: TodoPagination = null
  private limit: number = null

  constructor(
    private readonly docClient: DocumentClient = createXrayDynamoDBClient(),
    private readonly todosTable = process.env.TODOS_TABLE,
    private readonly todosTableIndex = process.env.TODOS_USER_ID_CREATED_AT_INDEX
  ) {
  }

  getTodosByUserIdWithPagination = async (userId: string, limit = null): Promise<TodoPagination> => {
    if (this.currentUserId === null || this.currentUserId !== userId) {
      this.currentUserId = userId
      this.shouldFetch = true
      logger.info('Should Fetch: ', userId, this.shouldFetch)
    }
    this.limit = limit
    const result = await this.fetchData()

    logger.info('Result: ', result)

    return result
  }

  createTodo = async (todoItem: TodoItem): Promise<TodoItem> => {
    const params = {
      TableName: this.todosTable,
      Item: todoItem
    }

    await this.docClient.put(params).promise()

    delete todoItem.userId

    this.shouldFetch = true
    return todoItem
  }

  updateTodo = async (
    todoId: string,
    userId: string,
    todoUpdate: TodoUpdate
  ): Promise<void> => {
    const params = {
      TableName: this.todosTable,
      Key: {
        todoId,
        userId
      },
      UpdateExpression: 'set #name = :updateName, #dueDate = :updateDueDate, #done = :updateDone',
      ExpressionAttributeValues: {
        ':updateName': todoUpdate.name,
        ':updateDueDate': todoUpdate.dueDate,
        ':updateDone': todoUpdate.done
      },
      ExpressionAttributeNames: {
        '#name': 'name',
        '#dueDate': 'dueDate',
        '#done': 'done'
      }
    }

    await this.docClient.update(params).promise()

    this.shouldFetch = true
  }

  updateTodoAttachment = async (
    todoId: string,
    userId: string,
    attachmentUrl: string
  ): Promise<void> => {
    const params = {
      TableName: this.todosTable,
      Key: {
        todoId,
        userId
      },
      UpdateExpression: 'set attachmentUrl = :attachmentUrl',
      ExpressionAttributeValues: {
        ':attachmentUrl': attachmentUrl
      }
    }

    await this.docClient.update(params).promise()

    this.shouldFetch = true
  }

  deleteTodo = async (todoId: string, userId: string): Promise<void> => {
    const params = {
      TableName: this.todosTable,
      Key: {
        todoId,
        userId
      }
    }

    await this.docClient.delete(params).promise()

    this.shouldFetch = true
  }

  private fetchData = async (): Promise<TodoPagination> => {
    if (this.shouldFetch || this.datas === null) {
      logger.info('Fetch data for user: ', this.currentUserId)

      let todos: ItemsWithPage[] = []
      let lastEvaluatedKey: any = null
      let currentPage: number = 1
      let items: TodoItem[]
      let totalItem: number = 0

      do {
        let params = {
          TableName: this.todosTable,
          LocalSecondaryIndexes: this.todosTableIndex,
          KeyConditionExpression: 'userId = :userId',
          ExpressionAttributeValues: {
            ':userId': this.currentUserId
          },
          Limit: this.limit,
          ExclusiveStartKey: lastEvaluatedKey,
          ScanIndexForward: true    // true = ascending, false = descending
        }

        let result = await this.docClient.query(params).promise()
        logger.info("result: ", result)
        if (result.ScannedCount > 0) {
          lastEvaluatedKey = result.LastEvaluatedKey
          items = result.Items as TodoItem[]
          totalItem += items.length
          todos = [...todos, {
            items: items,
            currentPage: currentPage++,
            nextKey: (encodeURIComponent(JSON.stringify(lastEvaluatedKey))) ?? null
          }]
          if (lastEvaluatedKey === undefined || lastEvaluatedKey === null) {
            break
          }
        } else {
          break;
        }
      } while (true)

      this.shouldFetch = false

      this.datas = {
        totalPage: Math.ceil(totalItem / this.limit),
        data: todos
      }
    }
    return this.datas
  }
}

const createXrayDynamoDBClient = () => {
  if (process.env.IS_OFFLINE) {
    logger.info('Create a local DynamoDB instance')
    return new XAWS.DynamoDB.DocumentClient({
      region: 'localhost',
      endpoint: 'http://localhost:8000'
    })
  }

  return new XAWS.DynamoDB.DocumentClient()
}
