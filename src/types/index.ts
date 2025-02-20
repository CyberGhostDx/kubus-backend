type BusData = {
  id: number;
  lat: number;
  lng: number;
  kmh: number;
};

type Coordinate = {
  lat: number;
  lng: number;
};

type BusStop = {
  id: number;
  signID: string;
  signName: string;
  lat: number;
  lng: number;
};

export type { BusData, BusStop, Coordinate };
