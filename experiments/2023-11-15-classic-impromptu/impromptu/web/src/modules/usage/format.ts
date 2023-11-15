export function formatLargeNumber(number: number) {
  const original = number;
  const units = ["", "K", "M", "B", "T"];
  let unitIndex = 0;
  while (number >= 1000 && unitIndex < units.length - 1) {
    number /= 1000;
    unitIndex++;
  }
  const roundedNumber = original < 1000 ? number : number.toFixed(1);
  const unit = units[unitIndex];
  return roundedNumber + unit;
}
