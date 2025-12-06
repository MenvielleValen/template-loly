import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";

/**
 * Shared storage for todos with file persistence
 * In production, use a database
 */

export type Todo = {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  createdAt: number;
  updatedAt: number;
};

const DATA_FILE = join(process.cwd(), ".loly", "todos.json");

// Singleton array - only initialized once
let _todos: Todo[] | null = null;

// Load todos from file or return empty array
function loadTodos(): Todo[] {
  try {
    if (existsSync(DATA_FILE)) {
      const data = readFileSync(DATA_FILE, "utf-8");
      const parsed = JSON.parse(data);
      console.log(`[Store] Loaded ${parsed.length} todos from file`);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (error) {
    console.error("[Store] Error loading todos:", error);
  }
  console.log("[Store] No todos file found, starting with empty array");
  return [];
}

// Save todos to file
function saveTodos(todos: Todo[]) {
  try {
    // Ensure directory exists
    const dir = dirname(DATA_FILE);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    
    writeFileSync(DATA_FILE, JSON.stringify(todos, null, 2), "utf-8");
    console.log(`[Store] Saved ${todos.length} todos to file`);
  } catch (error) {
    console.error("[Store] Error saving todos:", error);
  }
}

// Get the todos array (singleton)
function getTodos(): Todo[] {
  if (_todos === null) {
    _todos = loadTodos();
    console.log(`[Store] Initialized singleton with ${_todos.length} todos`);
  }
  return _todos;
}

// Export todos array - use getTodos() internally
export const todos = new Proxy([] as Todo[], {
  get(target, prop) {
    const actualTodos = getTodos();
    const value = (actualTodos as any)[prop];
    
    // If it's a function, bind it to the actual array
    if (typeof value === 'function') {
      if (prop === 'push' || prop === 'splice' || prop === 'sort') {
        // These methods modify the array, so we need to save after
        return function(...args: any[]) {
          const result = value.apply(actualTodos, args);
          saveTodos(actualTodos);
          return result;
        };
      }
      return value.bind(actualTodos);
    }
    
    return value;
  },
  set(target, prop, value) {
    const actualTodos = getTodos();
    (actualTodos as any)[prop] = value;
    if (typeof prop === 'string' && /^\d+$/.test(prop)) {
      // Array index assignment
      saveTodos(actualTodos);
    }
    return true;
  },
  has(target, prop) {
    return prop in getTodos();
  },
  ownKeys(target) {
    return Reflect.ownKeys(getTodos());
  },
  getOwnPropertyDescriptor(target, prop) {
    return Reflect.getOwnPropertyDescriptor(getTodos(), prop);
  }
});

// Helper function to generate ID
export function generateId(): string {
  return `todo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Helper function to persist todos
export function persistTodos() {
  saveTodos(getTodos());
  console.log(`[Store] Persisted ${getTodos().length} todos`);
}
