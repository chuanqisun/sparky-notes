export function formatLargeNumber(number: number) {
  const units = ["", "K", "M", "B", "T"];
  let unitIndex = 0;
  while (number >= 1000 && unitIndex < units.length - 1) {
    number /= 1000;
    unitIndex++;
  }
  const roundedNumber = number > 1000 ? number.toFixed(1) : number;
  const unit = units[unitIndex];
  return roundedNumber + unit;
}
