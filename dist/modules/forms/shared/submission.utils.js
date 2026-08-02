"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDefaultValues = buildDefaultValues;
exports.cleanObject = cleanObject;
exports.buildSubmissionMeta = buildSubmissionMeta;
function buildDefaultValues(fields = []) {
    const defaults = {};
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
function cleanObject(input) {
    const output = {};
    for (const [key, value] of Object.entries(input || {})) {
        if (value === undefined)
            continue;
        output[key] = value;
    }
    return output;
}
function buildSubmissionMeta(meta = {}) {
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
