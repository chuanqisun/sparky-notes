let cancelCallback: undefined | (() => void);
export function replaceNotification(message: string, options?: NotificationOptions) {
  try {
    cancelCallback?.();
  } catch (e) {}

  cancelCallback = figma.notify(message, options).cancel;
}

export function clearNotification() {
  cancelCallback?.();
}
