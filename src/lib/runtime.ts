export function isDevRuntime(): boolean {
  return import.meta.env.DEV;
}
