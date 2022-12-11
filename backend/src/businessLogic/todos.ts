import { S3Storage } from '../storageLayer/attachmentUtils'
import { TodosAccess } from '../dataLayer/todosAcess'
import { TodoItem } from '../models/TodoItem'
import { CreateTodoRequest } from '../requests/CreateTodoRequest'
import { UpdateTodoRequest } from '../requests/UpdateTodoRequest'
import { createLogger } from '../utils/logger'
import * as uuid from 'uuid'
import * as createError from 'http-errors'
import {attachmentUrl} from "../utils/constants";
import { TodoPagination } from '../models/TodoPagination'

const logger = createLogger('Todos')
const todosAccess = new TodosAccess()
const s3Storage = new S3Storage()

const getTodosByUserId = async (userId: string, limit: number): Promise<TodoPagination> => {
  try {
    const todos = await todosAccess.getTodosByUserId(userId, limit)
    logger.info('todos # getTodosByUserId - todos: ', todos)
    return todos
  } catch (error) {
    logger.error('Error when getting todos by user id: ', error)
    createError(400, JSON.stringify(error))
  }
}

const createTodo = async (
  userId: string,
  createTodoRequest: CreateTodoRequest
): Promise<TodoItem> => {
  try {
    const todoId = uuid.v4()
    const createdAt = new Date().toUTCString()
    const newTodo: TodoItem = {
      ...createTodoRequest,
      userId,
      todoId,
      createdAt,
      done: false
    }

    const todo = await todosAccess.createTodo(newTodo)
    logger.info('todos # createTodo - todo: ', todo)
    return todo
  } catch (error) {
    logger.error('Error when create new todo from request: ', error)
    createError(400, JSON.stringify(error))
  }
}

const updateTodo = async (
  todoId: string,
  userId: string,
  updateTodoRequest: UpdateTodoRequest
): Promise<void> => {
  try {
    await todosAccess.updateTodo(todoId, userId, updateTodoRequest)

    logger.info(
      `todos # updateTodo - update success todo with todoId ${todoId} and userId ${userId}`
    )
  } catch (error) {
    logger.error('Error when update todo from request: ', error)
    createError(400, JSON.stringify(error))
  }
}

const deleteTodoAndItsAttachment = async (todoId: string, userId: string): Promise<void> => {
  try {
    await todosAccess.deleteTodo(todoId, userId)
    await s3Storage.deleteAttachment(todoId, userId)

    logger.info(
      `todos # deleteTodoAndItAttachment - delete success ${todoId}`
    )
  } catch (error) {
    logger.error('Error #deleteTodoAndItAttachment: ', error)
    createError(400, JSON.stringify(error))
  }
}

const createAttachmentPresignedUrl = async (
  todoId: string,
  userId: string
): Promise<string> => {
  let url = ''
  try {
    url = s3Storage.getUploadUrl(todoId, userId)
    logger.info('todos #getUploadUrlAndUpdateTodoAttachment - url:', url)
  } catch (error) {
    logger.error('Error #getUploadUrlAndUpdateTodoAttachment: ', error)
    createError(400, JSON.stringify(error))
  }

  try {
    let updateAttachmentUrl = attachmentUrl(todoId, userId, s3Storage.getBucketName())
    await todosAccess.updateTodoAttachment(todoId, userId, updateAttachmentUrl)
    logger.info('todos #getUploadUrlAndUpdateTodoAttachment - updateTodoAttachment:', updateAttachmentUrl)
  } catch (e) {
    logger.error('Error #getUploadUrlAndUpdateTodoAttachment - updateTodoAttachment: ', e)
    createError(400, JSON.stringify(e))
  }

  return url
}

export {
  getTodosByUserId,
  createTodo,
  updateTodo,
  deleteTodoAndItsAttachment,
  createAttachmentPresignedUrl
}
