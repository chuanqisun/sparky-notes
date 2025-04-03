import type { FigmaNotification } from "@sticky-plus/figma-ipc-types";

export function setSpinner(proxy: (notification: FigmaNotification) => any, message: string, interval = 500) {
  let currentIndex = 0;

  const brackets = [
    ["⣷ ", ""],
    ["⣯ ", ""],
    ["⣟ ", ""],
    ["⡿ ", ""],
    ["⢿ ", ""],
    ["⣻ ", ""],
    ["⣽ ", ""],
    ["⣾ ", ""],
  ];

  const intervalId = setInterval(() => {
    const bracket = brackets[currentIndex++ % brackets.length];
    proxy({
      message: `${bracket[0]} ${message} ${bracket[1]}`,
      config: {
        timeout: 1_000,
      },
    });
  }, interval);

  return () => clearInterval(intervalId);
}
