import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Todo = {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  createdAt: number;
  updatedAt: number;
};

export default function TodosDemoPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  useEffect(() => {
    fetchTodos();
  }, []);

  async function fetchTodos() {
    setLoading(true);
    try {
      const response = await fetch("/api/todos");
      const data = await response.json();
      setTodos(data.todos || []);
    } catch (error) {
      console.error("Error fetching todos:", error);
    } finally {
      setLoading(false);
    }
  }

  async function createTodo() {
    if (!title.trim()) return;

    try {
      const response = await fetch("/api/todos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
        }),
      });

      if (response.ok) {
        const newTodo = await response.json();
        setTodos((prev) => [newTodo, ...prev]);
        setTitle("");
        setDescription("");
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || "Failed to create todo"}`);
      }
    } catch (error) {
      console.error("Error creating todo:", error);
      alert("Failed to create todo");
    }
  }

  async function updateTodo(id: string, updates: Partial<Todo>) {
    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const updatedTodo = await response.json();
        setTodos((prev) =>
          prev.map((todo) => (todo.id === id ? updatedTodo : todo))
        );
        setEditingId(null);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || "Failed to update todo"}`);
      }
    } catch (error) {
      console.error("Error updating todo:", error);
      alert("Failed to update todo");
    }
  }

  async function deleteTodo(id: string) {
    if (!confirm("Are you sure you want to delete this todo?")) return;

    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setTodos((prev) => prev.filter((todo) => todo.id !== id));
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || "Failed to delete todo"}`);
      }
    } catch (error) {
      console.error("Error deleting todo:", error);
      alert("Failed to delete todo");
    }
  }

  function toggleComplete(todo: Todo) {
    updateTodo(todo.id, { completed: !todo.completed });
  }

  function startEditing(todo: Todo) {
    setEditingId(todo.id);
    setEditTitle(todo.title);
    setEditDescription(todo.description || "");
  }

  function saveEdit(id: string) {
    updateTodo(id, {
      title: editTitle.trim(),
      description: editDescription.trim() || undefined,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTitle("");
    setEditDescription("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      createTodo();
    }
  }

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Todos API Demo</h1>
          <p className="text-muted-foreground">
            RESTful API demo with CRUD operations
          </p>
        </div>

        {/* Create Todo Form */}
        <div className="mb-6 rounded-lg border border-border bg-card p-6">
          <h2 className="text-xl font-semibold mb-4">Create New Todo</h2>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Todo title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full rounded-md border border-input bg-background px-3 py-2"
            />
            <textarea
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2"
            />
            <button
              onClick={createTodo}
              disabled={!title.trim()}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Create Todo
            </button>
          </div>
        </div>

        {/* Todos List */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Todos ({todos.length})</h2>
            <button
              onClick={fetchTodos}
              disabled={loading}
              className="rounded-md bg-secondary px-3 py-1 text-sm hover:bg-secondary/80 disabled:opacity-50"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>

          {todos.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No todos yet. Create one above!
            </p>
          ) : (
            <div className="space-y-2">
              {todos.map((todo) => (
                <div
                  key={todo.id}
                  className={cn(
                    "rounded-md border p-4",
                    todo.completed
                      ? "border-muted bg-muted/50"
                      : "border-border bg-background"
                  )}
                >
                  {editingId === todo.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                      />
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={2}
                        className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEdit(todo.id)}
                          className="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground hover:bg-primary/90"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="rounded-md bg-secondary px-3 py-1 text-sm hover:bg-secondary/80"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={todo.completed}
                        onChange={() => toggleComplete(todo)}
                        className="mt-1 h-4 w-4"
                      />
                      <div className="flex-1">
                        <h3
                          className={cn(
                            "font-medium",
                            todo.completed &&
                              "line-through text-muted-foreground"
                          )}
                        >
                          {todo.title}
                        </h3>
                        {todo.description && (
                          <p
                            className={cn(
                              "mt-1 text-sm text-muted-foreground",
                              todo.completed && "line-through"
                            )}
                          >
                            {todo.description}
                          </p>
                        )}
                        <p className="mt-2 text-xs text-muted-foreground">
                          Created: {new Date(todo.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEditing(todo)}
                          className="rounded-md bg-secondary px-2 py-1 text-xs hover:bg-secondary/80"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteTodo(todo.id)}
                          className="rounded-md bg-destructive px-2 py-1 text-xs text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
