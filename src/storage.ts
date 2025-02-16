export function get<T>(key: string, defaultValue: T): T {
  const value = localStorage.getItem(key);

  if (!value) {
    return defaultValue;
  }

  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error("Error parsing JSON from localStorage:", error);
    return defaultValue;
  }
}

export function save<T>(key: string, value: T): void {
  try {
    const stringValue = JSON.stringify(value);
    localStorage.setItem(key, stringValue);
  } catch (error) {
    console.error("Error saving to localStorage:", error);
  }
}
