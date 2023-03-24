export class ChangeTracker<T> {
  constructor(private value?: T | null | undefined) {}

  next(newValue: T) {
    if (newValue === this.value) {
      return false;
    } else {
      this.value = newValue;
      return true;
    }
  }
}
