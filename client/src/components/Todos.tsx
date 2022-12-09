import dateFormat from 'dateformat'
import { History } from 'history'
import update from 'immutability-helper'
import * as React from 'react'
import {
  Button,
  Checkbox,
  Divider,
  Grid,
  Header,
  Icon,
  Image,
  Input,
  Loader,
  Pagination,
  PaginationProps
} from 'semantic-ui-react'

import { createTodo, deleteTodo, getTodos, patchTodo } from '../api/todos-api'
import Auth from '../auth/Auth'
import { Todo } from '../types/Todo'
import { TodoPagination } from '../types/TodoPagination'

interface TodosProps {
  auth: Auth
  history: History
}

interface TodosState {
  result: TodoPagination | null
  todos: Todo[]
  newTodoName: string
  loadingTodos: boolean
  errorMessage: string
  currentPage?: string | number
  totalPage: number
  nextKey: any
  event: EventType
}

enum EventType {
  None,
  Create,
  Delete,
  Fetch,
  PageChange
}

export class Todos extends React.Component<TodosProps, TodosState> {
  state: TodosState = {
    result: null,
    todos: [],
    newTodoName: '',
    loadingTodos: true,
    errorMessage: '',
    nextKey: null,
    totalPage: 1,
    currentPage: '1',
    event: EventType.Fetch
  }

  handlePageChange = (mouseEvent: React.MouseEvent<HTMLAnchorElement>, { activePage }: PaginationProps) => {
    this.setState({
      currentPage: activePage,
      event: EventType.PageChange
    })
  }

  handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ newTodoName: event.target.value })
  }

  onEditButtonClick = (todoId: string) => {
    this.props.history.replace(`/todos/${todoId}/edit`, 'Edit')
  }

  onTodoCreate = async () => {
    try {
      const startTs = Date.now()
      if (this.state.newTodoName === '') {
        this.setState({
          errorMessage: 'Todo cannot empty'
        })
        return
      }

      const dueDate = this.calculateDueDate()
      await createTodo(this.props.auth.getIdToken(), {
        name: this.state.newTodoName,
        dueDate
      })
      alert('Todo creation success')
      this.setState({
        event: EventType.Create
      })
      const endTs = Date.now()
      console.log('CREATEE: ', endTs - startTs)
    } catch {
      alert('Todo creation failed')
    }
  }

  onTodoDelete = async (todoId: string) => {
    try {
      const startTs = Date.now()
      await deleteTodo(this.props.auth.getIdToken(), todoId)

      this.setState({
        event: EventType.Delete
      })

      const endTs = Date.now()
      console.log('OH MY GOD: ', endTs - startTs)

    } catch {
      alert('Todo deletion failed')
    }
  }

  handleDataChange = async () => {
    switch (this.state.event) {
      case EventType.Create: {
        const result = await getTodos(this.props.auth.getIdToken())
        const page = this.state?.currentPage?.toString()
        const data = result?.data.find(item => item?.currentPage.toString() === page)
        this.setState({
          result: result,
          totalPage: result.totalPage,
          todos: data === undefined ? [] : data.items,
          newTodoName: '',
          errorMessage: '',
          nextKey: data?.nextKey,
          loadingTodos: false,
          event: EventType.None
        })
      }
        break
      case EventType.Delete: {
        const result = await getTodos(this.props.auth.getIdToken())
        let page: number | string | undefined
        if (this.state.currentPage === this.state.totalPage && result.totalPage < this.state.totalPage) {
          page = result.totalPage
        } else {
          page = this.state.currentPage
        }
        const data = result?.data.find(item => item?.currentPage.toString() === page?.toString())
        this.setState({
          result: result,
          totalPage: result.totalPage,
          currentPage: page,
          todos: data === undefined ? [] : data.items,
          newTodoName: '',
          errorMessage: '',
          nextKey: data?.nextKey,
          loadingTodos: false,
          event: EventType.None
        })
      }
        break
      case EventType.Fetch: {
        const result = await getTodos(this.props.auth.getIdToken())
        const page = this.state?.currentPage?.toString() || '1'
        const data = result?.data.find(item => item?.currentPage.toString() === page)
        this.setState({
          result: result,
          totalPage: result.totalPage,
          currentPage: page,
          todos: data === undefined ? [] : data.items,
          newTodoName: '',
          errorMessage: '',
          nextKey: data?.nextKey,
          loadingTodos: false,
          event: EventType.None
        })
      }
        break
      case EventType.PageChange: {
        const result = this.state.result
        const data = result?.data.find(item => item.currentPage.toString() === this.state.currentPage?.toString())
        this.setState({
          todos: data === undefined ? [] : data.items,
          nextKey: data?.nextKey,
          event: EventType.None
        })
      }
        break
    }
  }

  // OK
  onTodoCheck = async (pos: number) => {
    try {
      const todo = this.state.todos[pos]
      await patchTodo(this.props.auth.getIdToken(), todo.todoId, {
        name: todo.name,
        dueDate: todo.dueDate,
        done: !todo.done
      })
      this.setState({
        todos: update(this.state.todos, {
          [pos]: { done: { $set: !todo.done } }
        })
      })
    } catch {
      alert('Todo deletion failed')
    }
  }

  async componentDidMount() {
    try {
      await this.handleDataChange()
    } catch (e) {
      alert(`Failed to fetch todos: ${(e as Error).message}`)
    }
  }

  async componentDidUpdate(prevProps: Readonly<TodosProps>, prevState: Readonly<TodosState>, snapshot?: any) {
    try {
      if (prevState.event !== this.state.event) {
        await this.handleDataChange()
      }
    } catch (e) {
      alert(`Failed to update todos: ${(e as Error).message}`)
    }
  }

  render() {
    return (
      <div>
        <Header as='h1'>TODOs</Header>

        {this.renderCreateTodoInput()}
        {this.renderTodos()}
      </div>
    )
  }


  renderCreateTodoInput() {
    return (
      <Grid.Row>
        <Grid.Column width={16}>
          {this.state.errorMessage && (<span style={{ color: 'red' }}>{this.state.errorMessage}</span>)}
          <Input
            style={{ color: 'red' }}
            disabled={this.state.event !== EventType.None}
            action={{
              color: 'teal',
              labelPosition: 'left',
              icon: 'add',
              content: 'New task',
              onClick: this.onTodoCreate,
              type: 'submit'
            }}
            fluid
            actionPosition='left'
            placeholder='To change the world...'
            value={this.state.newTodoName}
            onChange={this.handleNameChange}
          />
        </Grid.Column>
        {!this.state.loadingTodos && this.state.todos.length !== 0 && (
          <>
            <Grid.Column width={16}>
              <Divider />
            </Grid.Column>
            <Grid.Column width={16} style={{ textAlign: 'center' }}>
              <Pagination
                boundaryRange={0}
                defaultActivePage={this.state.currentPage}
                ellipsisItem={null}
                firstItem={null}
                lastItem={null}
                siblingRange={1}
                totalPages={this.state.totalPage}
                onPageChange={(event, data) => this.handlePageChange(event, data)} />
            </Grid.Column>
          </>
        )}

        <Grid.Column width={16}>
          <Divider />
        </Grid.Column>
      </Grid.Row>
    )
  }

  renderTodos() {
    if (this.state.loadingTodos) {
      return this.renderLoading()
    }

    return this.renderTodosList()
  }

  renderLoading() {
    return (
      <Grid.Row>
        <Loader indeterminate active inline='centered'>
          Loading TODOs
        </Loader>
      </Grid.Row>
    )
  }

  renderTodosList() {
    return (
      <Grid padded>
        {this.state.todos.map((todo, pos) => {
          return (
            <Grid.Row key={todo.todoId}>
              <Grid.Column width={1} verticalAlign='middle'>
                <Checkbox
                  onChange={() => this.onTodoCheck(pos)}
                  checked={todo.done}
                />
              </Grid.Column>
              <Grid.Column width={10} verticalAlign='middle'>
                {todo.name}
              </Grid.Column>
              <Grid.Column width={3} floated='right'>
                {todo.dueDate}
              </Grid.Column>
              <Grid.Column width={1} floated='right'>
                <Button
                  icon
                  color='blue'
                  onClick={() => this.onEditButtonClick(todo.todoId)}
                >
                  <Icon name='upload' />
                </Button>
              </Grid.Column>
              <Grid.Column width={1} floated='right'>
                <Button
                  icon
                  color='red'
                  onClick={() => this.onTodoDelete(todo.todoId)}
                >
                  <Icon name='delete' />
                </Button>
              </Grid.Column>
              {todo.attachmentUrl && (
                <Image src={todo.attachmentUrl} size='small' wrapped />
              )}
              <Grid.Column width={16}>
                <Divider />
              </Grid.Column>
            </Grid.Row>
          )
        })}
      </Grid>
    )
  }

  calculateDueDate(): string {
    const date = new Date()
    date.setDate(date.getDate() + 7)

    return dateFormat(date, 'yyyy-mm-dd') as string
  }
}
