import type { ApiContext } from "@lolyjs/core";
import { validate } from "@lolyjs/core";
import { z } from "zod";
import { todos, generateId, persistTodos } from "./store";

/**
 * API route for managing todos
 * 
 * GET /api/todos - Get all todos
 * POST /api/todos - Create a new todo
 */

// Validation schemas
const createTodoSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
});

// GET /api/todos - Get all todos
export async function GET(ctx: ApiContext) {
  const { query } = ctx.req;
  
  let filteredTodos = [...todos];

  // Filter by completed status if provided
  if (query.completed !== undefined) {
    const isCompleted = query.completed === "true";
    filteredTodos = filteredTodos.filter((todo) => todo.completed === isCompleted);
  }

  // Sort by createdAt (newest first)
  filteredTodos.sort((a, b) => b.createdAt - a.createdAt);

  return ctx.Response({
    todos: filteredTodos,
    count: filteredTodos.length,
  });
}

// POST /api/todos - Create a new todo
export async function POST(ctx: ApiContext) {
  try {
    const body = validate(createTodoSchema, ctx.req.body);

    const newTodo = {
      id: generateId(),
      title: body.title,
      description: body.description || "",
      completed: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    todos.push(newTodo);
    persistTodos();

    return ctx.Response(newTodo, 201);
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
