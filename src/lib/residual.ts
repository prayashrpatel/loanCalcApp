export function estimateResidual(msrp: number, years: number) {
  // toy curve: ~20% first year, 12% thereafter
  let value = msrp;
  for (let y=1; y<=years; y++) value *= (y===1 ? 0.80 : 0.88);
  return Math.max(Math.round(value), 0);
}
