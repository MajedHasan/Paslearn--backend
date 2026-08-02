"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getValidationRules = getValidationRules;
exports.validateFormSchema = validateFormSchema;
exports.validateConditionalRules = validateConditionalRules;
exports.validateSteps = validateSteps;
function getValidationRules(field) {
    const rules = {};
    const v = field.validation ?? {};
    if (v.required) {
        rules.required = `${field.label} is required`;
    }
    if (typeof v.minLength === "number") {
        rules.minLength = {
            value: v.minLength,
            message: `Minimum ${v.minLength} characters`,
        };
    }
    if (typeof v.maxLength === "number") {
        rules.maxLength = {
            value: v.maxLength,
            message: `Maximum ${v.maxLength} characters`,
        };
    }
    if (typeof v.min === "number") {
        rules.min = {
            value: v.min,
            message: `Minimum value is ${v.min}`,
        };
    }
    if (typeof v.max === "number") {
        rules.max = {
            value: v.max,
            message: `Maximum value is ${v.max}`,
        };
    }
    if (v.pattern) {
        rules.pattern = {
            value: new RegExp(v.pattern),
            message: v.patternMessage || "Invalid format",
        };
    }
    // File validations are handled client‑side / multer on backend
    return rules;
}
function validateFormSchema(fields = [], layout = []) {
    const errors = [];
    const keys = new Set();
    const names = new Set();
    for (const field of fields) {
        if (!field.key?.trim())
            errors.push("Every field must have a key");
        if (!field.name?.trim())
            errors.push(`Field "${field.key || "unknown"}" must have a name`);
        if (keys.has(field.key))
            errors.push(`Duplicate field key: "${field.key}"`);
        if (names.has(field.name))
            errors.push(`Duplicate field name: "${field.name}"`);
        keys.add(field.key);
        names.add(field.name);
    }
    const fieldKeys = new Set(fields.map((f) => f.key));
    const walk = (blocks) => {
        for (const block of blocks) {
            if (block.type === "field" && block.fieldKey && !fieldKeys.has(block.fieldKey)) {
                errors.push(`Layout references missing field key: "${block.fieldKey}"`);
            }
            if (block.children?.length)
                walk(block.children);
        }
    };
    walk(layout);
    return errors;
}
// NEW: validate conditional rules
function validateConditionalRules(rules, fields) {
    const errors = [];
    const fieldKeys = new Set(fields.map(f => f.key));
    for (const rule of rules) {
        if (!fieldKeys.has(rule.fieldKey)) {
            errors.push(`Conditional rule references unknown field: "${rule.fieldKey}"`);
        }
        for (const cond of rule.conditions) {
            if (!fieldKeys.has(cond.fieldKey)) {
                errors.push(`Condition references unknown field: "${cond.fieldKey}"`);
            }
            if (cond.operator !== "is_empty" && cond.operator !== "is_not_empty" && cond.value === undefined) {
                errors.push(`Condition on "${cond.fieldKey}" requires a value`);
            }
        }
    }
    return errors;
}
// NEW: validate steps
function validateSteps(steps, fields) {
    const errors = [];
    for (const step of steps) {
        const stepErrors = validateFormSchema(fields, step.layout);
        if (stepErrors.length) {
            errors.push(`Step "${step.title}": ${stepErrors.join(", ")}`);
        }
    }
    return errors;
}
