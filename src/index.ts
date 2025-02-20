import { Elysia } from "elysia";
import mqtt from "@/mqtt";
import logger from "@/logger";
import { getBusCheckpoint, getBusesStatus } from "./libs/googleSheet";

mqtt();

const app = new Elysia({
  serve: {
    hostname: "127.0.0.1",
  },
})
  .get("/", (req) => {
    // console.log(req.headers);
    return { payload: "Hello Elysia" };
  })
  .ws("/ws", {
    async open(ws) {
      logger.info(`Client id: ${ws.id} Connected`);
      ws.subscribe("bus");
      ws.subscribe("checkpoint");
      const buses = await getBusesStatus();
      const currentCheckpoint = await getBusCheckpoint();
      const checkpoint = {
        currentCheckpoint,
        nextCheckpoint: currentCheckpoint + 1,
        estimate: 0,
      };
      ws.send(JSON.stringify({ topic: "buses", payload: buses }));
      ws.send(JSON.stringify({ topic: "checkpoint", payload: checkpoint }));
    },
    message(ws, message) {
      logger.info(message);
    },
    close(ws) {
      logger.info(`Client id: ${ws.id} Disconnected`);
    },
  })
  .listen(3001);

logger.info(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);

const server = app.server;

export { server, logger };
