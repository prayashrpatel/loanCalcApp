export interface TCOInputs { milesPerYear: number; mpg?: number; fuelPrice?: number; insurancePerMonth?: number; maintPerMonth?: number; }
export function estimateTcoPerMonth(inp: TCOInputs) {
  const fuel = inp.mpg && inp.fuelPrice ? (inp.milesPerYear / 12 / inp.mpg) * inp.fuelPrice : 0;
  return (inp.insurancePerMonth ?? 0) + (inp.maintPerMonth ?? 0) + fuel;
}
