import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import { BusData } from "@/types";

const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheetID = process.env.SHEET_ID || "";

const doc = new GoogleSpreadsheet(sheetID, serviceAccountAuth);

const initSpreadSheet = async () => {
  await doc.loadInfo();
};

const maxBus = 9;

const getBusesStatus = async (): Promise<BusData[] | undefined> => {
  const sheet = doc.sheetsById["185513905"];
  await sheet
    .loadCells("A2:D10")
    .catch((err) => console.log(`Error Status ${err.status}`));
  const buses: BusData[] = [];
  for (let i = 2; i < maxBus + 2; i++) {
    const isAvailable = sheet.getCellByA1(`D${i}`);
    if (isAvailable.value == "unavailable" || isAvailable.value == null)
      continue;
    const coor = (sheet.getCellByA1(`B${i}`).value as string).split(",");
    if (coor.length < 2) continue;
    if (Number.isNaN(+coor[0]) || Number.isNaN(+coor[1])) return;
    const busCoor = coor.map(Number);
    const id = Number(sheet.getCellByA1(`A${i}`).value);
    const kmh = Number(sheet.getCellByA1(`C${i}`).value);
    buses.push({ id, lat: busCoor[0], lng: busCoor[1], kmh });
  }
  return buses;
};

const setBusStatus = async ({ id, lat, lng, kmh }: BusData) => {
  const sheet = doc.sheetsById["185513905"];
  await sheet
    .loadCells("A2:D10")
    .catch((err) => console.log(`Error Status ${err.status}`));
  let cellID = 0;
  let isFound = false;
  for (let i = 2; i < maxBus + 2; i++) {
    const bid = sheet.getCellByA1(`A${i}`).value;
    if (bid == id) {
      cellID = i;
      isFound = true;
      break;
    }
  }
  if (!isFound) return;
  const busCoor = sheet.getCellByA1(`B${cellID}`);
  const busKmh = sheet.getCellByA1(`C${cellID}`);
  busCoor.value = `${lat},${lng}`;
  busKmh.value = kmh;
  await sheet.saveUpdatedCells();
};

const getBusCheckpoint = async (): Promise<number> => {
  const sheet = doc.sheetsById["0"];
  await sheet
    .loadCells(["E2:E24", "H4"])
    .catch((err) => console.log(`Error Status ${err.status}`));
  const checkpoint = sheet.getCellByA1("H4");
  return Number(checkpoint.value);
};
const setBusCheckpoint = async (id: number) => {
  const sheet = doc.sheetsById["0"];
  const checkpoint = sheet.getCellByA1("H4");
  if (id == 23) {
    for (let i = 2; i <= 24; i++) {
      sheet.getCellByA1(`E${i}`).boolValue = false;
    }
    checkpoint.value = 0;
    await sheet.saveUpdatedCells();
    return;
  }
  for (let i = 2; i <= id + 1; i++) {
    sheet.getCellByA1(`E${i}`).boolValue = true;
  }
  for (let i = id + 2; i <= 24; i++) {
    sheet.getCellByA1(`E${i}`).boolValue = false;
  }
  checkpoint.value = id;
  await sheet.saveUpdatedCells();
};

export {
  initSpreadSheet,
  getBusesStatus,
  getBusCheckpoint,
  setBusStatus,
  setBusCheckpoint,
};

// export default async function getDoc() {
//   await doc.loadInfo();
//   console.log(doc.title);
//   const sheet = doc.sheetsById["0"];
//   console.log(sheet.title);
//   const rows = await sheet.getRows({ limit: 24 });
// }
