import { Elysia, t } from 'elysia';
import { html } from '@elysiajs/html';
import * as elements from 'typed-html'
import { db } from './db';
import { Todo, todos } from './db/schema';
import { eq } from 'drizzle-orm';

const app = new Elysia()
  .use(html())
  .get('/', ({ html }) => html(
    <BaseHtml>
      <body 
        class="flex w-full h-screen justify-center items-center"
        hx-get="/todos"
        hx-trigger="load"
        hx-swap="innerHTML"
      >  
      </body>
    </BaseHtml>
  ))
  .post('/clicked', () => { 
    return <div class="text-blue-500">I'm from the server!</div>
  })
  .get("/todos", async () => {
    const data = await db.select().from(todos).all();
    return <TodoList todos={data} />;
  })
  .post('/todos',
    async ({ body }) => {
      if(body.content.length === 0) {
        throw new Error('Content cannot be empty')
      }

      const newTodo = await db.insert(todos).values(body).returning().get();

      return <TodoItem {...newTodo} />;
    },
    {
      body: t.Object({
        content: t.String({ minLength: 1 })
      })
    }
  )
  .post(
    "/todos/toggle/:id",
    async ({ params }) => {
      const oldTodo = await db
        .select()
        .from(todos)
        .where(eq(todos.id, params.id))
        .get();

      if (!oldTodo) {
        throw new Error("Todo not found");
      }

      const newTodo = await db
        .update(todos)
        .set({ completed: !oldTodo.completed })
        .where(eq(todos.id, params.id))
        .returning()
        .get();
      return <TodoItem {...newTodo} />;
    },
    {
      params: t.Object({
        id: t.Numeric()
      })
    }
  )
  .delete("/todos/:id", 
    async ({ params }) => {
      await db.delete(todos).where(eq(todos.id, params.id)).run();
    },
    {
      params: t.Object({
        id: t.Numeric()
      })
    }
  )
  .listen(3001);
  
console.log(`🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`)

const BaseHtml = ({ children }: elements.Children) =>  `
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="description" content="The Beth Stack">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>THE BETH STACK</title>
  <script src="https://unpkg.com/htmx.org@1.9.3"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/hyperscript.org@0.9.9"></script>
</head>

${children} 
`;

function TodoItem({ content, completed, id }: Todo) {
  return (
    <div class="p-4 flex flex-row justify-between gap-4 border border-black">
      <p>{content}</p>
      <input 
        type="checkbox" 
        checked={completed} 
        hx-post={`/todos/toggle/${id}`}
        hx-target="closest div"
        hx-swap="outerHTML"
      />
      <button 
        class="px-1.5 bg-red-500 rounded"
        hx-delete={`/todos/${id}`}
        hx-swap="outerHTML"
        hx-target="closest div"
      >
        ✕
      </button>
    </div>
  )
}

function TodoList({ todos }: { todos: Todo[] }) {
  return (
    <div>
      {todos.map((todo) => (
        <TodoItem {...todo} />
      ))}
      <TodoForm />
    </div>
  )
}

function TodoForm() {
  return (
    <form 
      class="flex flex-row space-x-3"
      hx-post="/todos"
      hx-swap="beforebegin"
      _="on submit target.reset()"
    >
      <input type="text" name="content" class="border border-black" />
      <button class="px-4 bg-green-500 rounded">Add</button>
    </form>
  )
}