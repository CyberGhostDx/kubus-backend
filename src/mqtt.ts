import haversine from "@/libs/haversine";
import mqtt from "mqtt";
import { server, logger } from "./";
import { BusData, BusStop } from "@/types";
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
  let nextCheckpoint = checkpoint % 23;
  let nextBusStop = busStops[nextCheckpoint];
  let distance =
    haversine([busData.lat, busData.lng], [nextBusStop.lat, nextBusStop.lng]) *
    1000;
  let estimate = Math.round((distance / 1000 / kmh) * 60);
  let data = {
    currentCheckpoint: checkpoint,
    nextCheckpoint: (nextCheckpoint + 1) % 23,
    estimate,
  };
  if (distance > 30) {
    server?.publish(
      "checkpoint",
      JSON.stringify({ topic: "estimate", payload: estimate }),
    );
  } else {
    data["currentCheckpoint"] += 1;
    data["nextCheckpoint"] += 1;
    data["nextCheckpoint"] %= 23;
    nextBusStop = busStops[data["nextCheckpoint"]];
    distance =
      haversine(
        [busData.lat, busData.lng],
        [nextBusStop.lat, nextBusStop.lng],
      ) * 1000;
    estimate = Math.round((distance / 1000 / kmh) * 60);
    data["estimate"] = estimate;
    server?.publish(
      "checkpoint",
      JSON.stringify({ topic: "checkpoint", payload: data }),
    );
    setBusCheckpoint(nextCheckpoint + 1);
  }
  handleEstimate(data["nextCheckpoint"], estimate, busData);
};

const handleEstimate = (
  nextCheckpoint: number,
  estimate: number,
  busData: BusData,
) => {
  const numOfBusStop = busStops.length;
  const estimates: (BusStop & { estimate: number })[] = [];
  if (nextCheckpoint == 0) return;
  for (let i = nextCheckpoint; i < numOfBusStop; i++) {
    const currentBusStop = busStops[i - 1];
    const nextBusStop = busStops[i];
    const distance = haversine(
      [currentBusStop.lat, currentBusStop.lng],
      [nextBusStop.lat, nextBusStop.lng],
    );
    const estimateBetweenStop = Math.round((distance / busData.kmh) * 60);
    const realEstimate =
      i == nextCheckpoint
        ? estimateBetweenStop + estimate
        : Math.round(
            (estimateBetweenStop + estimates[i - 1 - nextCheckpoint].estimate) *
              1.1,
          );
    estimates.push({ ...nextBusStop, estimate: realEstimate });
  }
  server?.publish(
    "estimates",
    JSON.stringify({ topic: "estimates", payload: estimates }),
  );
};
