let cancelCallback: undefined | (() => void);
export function replaceNotification(message: string, options?: NotificationOptions) {
  cancelCallback?.();
  cancelCallback = figma.notify(message, options).cancel;
}

export function clearNotification() {
  cancelCallback?.();
}
