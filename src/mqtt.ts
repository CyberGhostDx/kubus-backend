import haversine from "@/libs/haversine";
import mqtt from "mqtt";
import { server, logger } from "./";
import { BusData } from "@/types";
import busStops from "@/libs/busStop";
import {
  initSpreadSheet,
  setBusStatus,
  getBusCheckpoint,
  setBusCheckpoint,
} from "@/libs/googleSheet";
import {
  mqttServer,
  mqttUsername,
  mqttPassword,
  mqttTopicPrefix,
} from "@/config";
const busTopic = "/bus";

await initSpreadSheet();

const mqttInit = () => {
  const mqttClient = mqtt.connect(mqttServer, {
    port: 1883,
    username: mqttUsername,
    password: mqttPassword,
  });

  mqttClient.on("connect", () => {
    logger.info("MQTT Connected");
    mqttClient.subscribe(`${mqttTopicPrefix}/#`);
  });

  mqttClient.on("message", (topic, message) => {
    if (topic == mqttTopicPrefix + busTopic) {
      let msg = message
        .toString()
        .replace(/(\r\n|\n|\r)/gm, "")
        .split(",");
      if (msg.length < 4) return;
      for (const data of msg) {
        if (Number.isNaN(+data)) return;
      }
      let data = msg.map(Number);
      const busData: BusData = {
        id: 1,
        lat: data[1],
        lng: data[2],
        kmh: data[3],
      };
      if (busData.id < 1 || busData.lat == 0 || busData.lng == 0) return;
      handleBus(busData);
      handleCheckpoint(busData);
    }
  });
};

export default mqttInit;

const handleBus = (busData: BusData) => {
  setBusStatus(busData);
  server?.publish("bus", JSON.stringify({ topic: "bus", payload: busData }));
};

const handleCheckpoint = async (busData: BusData) => {
  const checkpoint = await getBusCheckpoint();
  const kmh = busData.kmh;
  const nextCheckpoint = checkpoint % 23;
  const nextBusStop = busStops[nextCheckpoint];
  const distance =
    haversine([busData.lat, busData.lng], [nextBusStop.lat, nextBusStop.lng]) *
    1000;
  const estimate = Math.round((distance / 1000 / kmh) * 60);
  console.log((distance / 1000 / kmh) * 60);
  let data = {
    currentCheckpoint: checkpoint,
    nextCheckpoint: (nextCheckpoint + 1) % 23,
    estimate,
  };
  if (distance > 30) {
    server?.publish(
      "checkpoint",
      JSON.stringify({ topic: "checkpoint", payload: data }),
    );
  } else {
    data["currentCheckpoint"] += 1;
    data["nextCheckpoint"] += 1;
    data["nextCheckpoint"] %= 23;
    server?.publish(
      "checkpoint",
      JSON.stringify({ topic: "checkpoint", payload: data }),
    );
    setBusCheckpoint(nextCheckpoint + 1);
  }
};
