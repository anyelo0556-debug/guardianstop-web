import type { Hono } from "hono";
import type { HttpBindings } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import fs from "fs";
import path from "path";

type App = Hono<{ Bindings: HttpBindings }>;

export function serveStaticFiles(app: App) {
  // Buscar la carpeta de la pagina compilada en todas las ubicaciones posibles
  const candidates = [
    path.resolve(import.meta.dirname, "../dist/public"),
    path.resolve(import.meta.dirname, "../../src/dist/public"),
    path.resolve(process.cwd(), "src/dist/public"),
    path.resolve(process.cwd(), "dist/public"),
  ];
  const distPath =
    candidates.find((p) => fs.existsSync(path.join(p, "index.html"))) ??
    candidates[0];

  const root =
    "/" +
    path
      .relative(process.cwd(), distPath)
      .replace(/\\/g, "/")
      .replace(/^\//, "");

  app.use("*", serveStatic({ root }));

  app.notFound((c) => {
    const accept = c.req.header("accept") ?? "";
    if (!accept.includes("text/html")) {
      return c.json({ error: "Not Found" }, 404);
    }
    const content = fs.readFileSync(path.join(distPath, "index.html"), "utf-8");
    return c.html(content);
  });
}
