import { Todo } from './Todo'

export interface ItemsWithPage {
  items: Todo[],
  nextKey: string,
  currentPage: string
}
