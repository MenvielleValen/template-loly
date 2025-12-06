import { Link } from "@lolyjs/core/components";

export const Header = () => {
  return (
    <header className="flex justify-center items-center p-4">
      <nav className="flex gap-6">
        <Link
          href="/"
          className="text-lg font-medium hover:text-primary transition-colors"
        >
          Home
        </Link>
        <Link
          href="/whiteboard-demo"
          className="text-lg font-medium hover:text-primary transition-colors"
        >
          Whiteboard Demo
        </Link>
        <Link
          href="/todos-demo"
          className="text-lg font-medium hover:text-primary transition-colors"
        >
          Todos Demo
        </Link>
      </nav>
    </header>
  );
};
