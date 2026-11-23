import { createServer } from "node:http";

const port = Number(process.env.PORT ?? 3000);

createServer((request, response) => {
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.end("<!doctype html><html><body><h1>Schedule</h1></body></html>");
}).listen(port, "127.0.0.1");
