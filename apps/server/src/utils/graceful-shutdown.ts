import type { Server } from "http";
import type { Socket } from "net";

// Ref: https://stackoverflow.com/questions/43003870/how-do-i-shut-down-my-express-server-gracefully-when-its-process-is-killed

export function withGracefulShutdown(server: Server) {
  const shutdownOnce = memoize(() => shutDown());
  let connections: Socket[] = [];
  const logConnectionCountChange = memoize((count: number) => console.log(`Connection count changed: ${count}`));

  process.on("SIGTERM", shutdownOnce);
  process.on("SIGINT", shutdownOnce);

  setInterval(() => server.getConnections((err, connections) => logConnectionCountChange(connections)), 3000);

  server.on("connection", (connection) => {
    connections.push(connection);
    connection.on("close", () => (connections = connections.filter((curr) => curr !== connection)));
  });

  function shutDown() {
    console.log("Received kill signal, shutting down gracefully");
    server.close(() => {
      console.log("Closed out remaining connections");
      process.exit(0);
    });

    setTimeout(() => {
      console.error("Could not close connections in time, forcefully shutting down");
      process.exit(1);
    }, 10000);

    connections.forEach((curr) => curr.end());
    setTimeout(() => connections.forEach((curr) => curr.destroy()), 5000);
  }

  return server;
}

function memoize<T extends any[], R>(fn: (...args: T) => R) {
  let lastArgs: T | undefined;
  let lastResult: R | undefined;
  return (...args: T): R => {
    if (lastArgs && args.every((arg, i) => arg === lastArgs![i])) {
      return lastResult!;
    }
    lastArgs = args;
    lastResult = fn(...args);
    return lastResult;
  };
}
