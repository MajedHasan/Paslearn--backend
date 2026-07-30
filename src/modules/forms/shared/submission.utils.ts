import { FieldDefinition } from "./field.types";

export function buildDefaultValues(fields: FieldDefinition[] = []) {
  const defaults: Record<string, any> = {};

  for (const field of fields) {
    if (field.type === "checkbox") {
      defaults[field.name] = Boolean(field.defaultValue ?? false);
      continue;
    }

    if (field.type === "multiselect") {
      defaults[field.name] = Array.isArray(field.defaultValue)
        ? field.defaultValue
        : [];
      continue;
    }

    defaults[field.name] = field.defaultValue ?? "";
  }

  return defaults;
}

export function cleanObject<T extends Record<string, any>>(input: T): T {
  const output: Record<string, any> = {};

  for (const [key, value] of Object.entries(input || {})) {
    if (value === undefined) continue;
    output[key] = value;
  }

  return output as T;
}

export function buildSubmissionMeta(meta: Record<string, any> = {}) {
  return cleanObject({
    pathname: meta.pathname ?? "",
    url: meta.url ?? "",
    referrer: meta.referrer ?? "",
    userAgent: meta.userAgent ?? "",
    language: meta.language ?? "",
    screen: meta.screen ?? null,
    ip: meta.ip ?? "",
    source: meta.source ?? "runtime",
  });
}
