export type ScaffoldFile = { path: string; content: string };

const packageManifest = {
  name: "project",
  private: true,
  version: "0.0.0",
  type: "module",
  scripts: {
    dev: "vite",
    build: "tsc --noEmit && vite build",
    preview: "vite preview",
  },
  dependencies: {
    react: "^18.3.1",
    "react-dom": "^18.3.1",
  },
  devDependencies: {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    typescript: "^5.6.3",
    vite: "^5.4.11",
  },
};

const compilerConfig = {
  compilerOptions: {
    target: "ES2020",
    lib: ["ES2020", "DOM", "DOM.Iterable"],
    module: "ESNext",
    moduleResolution: "bundler",
    jsx: "react-jsx",
    strict: true,
    noEmit: true,
    isolatedModules: true,
    skipLibCheck: true,
    esModuleInterop: true,
  },
  include: ["."],
  exclude: ["node_modules", "dist"],
};

const viteConfig = `import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
});
`;

const indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Project</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/main.tsx"></script>
  </body>
</html>
`;

const mainEntry = `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

const container = document.getElementById("root");

if (container) {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
`;

const appComponent = `export function App() {
  return (
    <main>
      <h1>Project</h1>
    </main>
  );
}

export default App;
`;

const asJson = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

export const scaffoldFiles: readonly ScaffoldFile[] = [
  { path: "package.json", content: asJson(packageManifest) },
  { path: "tsconfig.json", content: asJson(compilerConfig) },
  { path: "vite.config.ts", content: viteConfig },
  { path: "index.html", content: indexHtml },
  { path: "main.tsx", content: mainEntry },
  { path: "App.tsx", content: appComponent },
];
