import type { BodyType } from "../scene/carWireframe";

/** Faz 1 demo aracı — gerçek üründe araç dosyasından gelir. */
export const demoVehicle = {
  plate: "34 ABC 123",
  model: "Renault Megane",
  year: 2019,
  vin: "VF1···847",
  bodyType: "sedan" as BodyType,
  km: 84_500,
  nextServiceKm: 90_000,
  lastServiceKm: 71_000,
  owner: "A. Yılmaz",
  phone: "0532 ··· ·· 41",
};
