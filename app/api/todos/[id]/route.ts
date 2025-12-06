import type { ApiContext } from "@lolyjs/core";
import { validate } from "@lolyjs/core";
import { z } from "zod";
import { todos, persistTodos } from "../store";

/**
 * API route for managing individual todos by ID
 * 
 * PUT /api/todos/:id - Update a todo
 * DELETE /api/todos/:id - Delete a todo
 */

// Validation schema
const updateTodoSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  completed: z.boolean().optional(),
});

// PUT /api/todos/:id - Update a todo
export async function PUT(ctx: ApiContext) {
  try {
    // Get id from params - try different possible locations
    const id = ctx.params?.id || ctx.params?.["id"] || (ctx.pathname?.match(/\/api\/todos\/([^\/]+)/)?.[1]);

    if (!id) {
      console.error("PUT - No ID found:", {
        params: ctx.params,
        pathname: ctx.pathname,
        url: ctx.req.url,
      });
      return ctx.Response({ error: "ID parameter is required" }, 400);
    }

    console.log("PUT request received for todo:", {
      id,
      idType: typeof id,
      todosCount: todos.length,
      todosIds: todos.map(t => t.id),
      matchingTodo: todos.find(t => t.id === id),
    });

    const body = validate(updateTodoSchema, ctx.req.body);

    const todoIndex = todos.findIndex((todo) => todo.id === id);

    if (todoIndex === -1) {
      console.error("PUT - Todo not found:", {
        id,
        availableIds: todos.map(t => t.id),
        todos: todos,
      });
      return ctx.Response({ 
        error: "Todo not found",
        providedId: id,
        availableIds: todos.map(t => t.id),
      }, 404);
    }

    const updatedTodo = {
      ...todos[todoIndex],
      ...body,
      updatedAt: Date.now(),
    };

    todos[todoIndex] = updatedTodo;
    persistTodos();

    return ctx.Response(updatedTodo);
  } catch (error) {
    if (error instanceof Error) {
      return ctx.Response(
        { error: error.message },
        400
      );
    }
    return ctx.Response({ error: "Invalid request" }, 400);
  }
}

// DELETE /api/todos/:id - Delete a todo
export async function DELETE(ctx: ApiContext) {
  // Get id from params - try different possible locations
  const id = ctx.params?.id || ctx.params?.["id"] || (ctx.pathname?.match(/\/api\/todos\/([^\/]+)/)?.[1]);

  if (!id) {
    console.error("DELETE - No ID found:", {
      params: ctx.params,
      pathname: ctx.pathname,
      url: ctx.req.url,
    });
    return ctx.Response({ error: "ID parameter is required" }, 400);
  }

  console.log("DELETE request for todo:", {
    id,
    todosCount: todos.length,
    todosIds: todos.map(t => t.id),
  });

  const todoIndex = todos.findIndex((todo) => todo.id === id);

  if (todoIndex === -1) {
    return ctx.Response({ error: "Todo not found" }, 404);
  }

  const deletedTodo = todos[todoIndex];
  todos.splice(todoIndex, 1);
  persistTodos();

  return ctx.Response({ message: "Todo deleted", todo: deletedTodo });
}

