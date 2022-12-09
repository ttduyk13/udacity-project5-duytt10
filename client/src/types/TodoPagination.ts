import { ItemsWithPage } from './ItemsWithPage'

export interface TodoPagination {
  totalPage: number,
  data: ItemsWithPage[]
}
