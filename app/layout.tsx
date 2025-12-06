import React from "react";
import { ThemeProvider } from "@lolyjs/core/themes";
import { Link } from "@lolyjs/core/components";
import { Header } from "@/components/header";

export default function RootLayout({
  children,
  theme,
}: {
  children: React.ReactNode;
  theme: string;
}) {
  return (
    <ThemeProvider initialTheme={theme}>
      <Header />
      {children}
    </ThemeProvider>
  );
}
