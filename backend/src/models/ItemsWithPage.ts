import { TodoItem } from './TodoItem'

export interface ItemsWithPage {
  items: TodoItem[],
  currentPage: number,
  nextKey: string
}
