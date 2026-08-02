"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAutomation = createAutomation;
exports.getAllAutomations = getAllAutomations;
exports.getAutomationById = getAutomationById;
exports.updateAutomation = updateAutomation;
exports.deleteAutomation = deleteAutomation;
exports.toggleAutomation = toggleAutomation;
exports.executeAutomations = executeAutomations;
const automation_model_1 = require("./automation.model");
const mongoose_1 = __importDefault(require("mongoose"));
const submission_model_1 = __importDefault(require("../submission/submission.model"));
// ── CRUD ─────────────────────────────────────────────────
async function createAutomation(payload) {
    return automation_model_1.AutomationModel.create(payload);
}
async function getAllAutomations(filter = {}) {
    return automation_model_1.AutomationModel.find(filter)
        .sort({ createdAt: -1 })
        .lean();
}
async function getAutomationById(id) {
    if (!mongoose_1.default.Types.ObjectId.isValid(id))
        return null;
    return automation_model_1.AutomationModel.findById(id).lean();
}
async function updateAutomation(id, payload) {
    const automation = await automation_model_1.AutomationModel.findById(id);
    if (!automation)
        return null;
    Object.assign(automation, payload);
    await automation.save();
    return automation.toObject();
}
async function deleteAutomation(id) {
    return automation_model_1.AutomationModel.findByIdAndDelete(id).lean();
}
async function toggleAutomation(id) {
    const automation = await automation_model_1.AutomationModel.findById(id);
    if (!automation)
        throw new Error("Automation not found");
    automation.enabled = !automation.enabled;
    await automation.save();
    return automation.toObject();
}
// ── Trigger + Execute ────────────────────────────────────
async function executeAutomations(ctx) {
    const automations = await automation_model_1.AutomationModel.find({
        enabled: true,
        "trigger.resource": ctx.resource,
        "trigger.event": ctx.event,
    }).lean();
    for (const automation of automations) {
        let log = null;
        try {
            // 1. Check top‑level filters
            if (automation.trigger.filters &&
                Object.keys(automation.trigger.filters).length > 0) {
                const filterMatch = Object.entries(automation.trigger.filters).every(([key, val]) => {
                    const dataVal = key
                        .split(".")
                        .reduce((obj, k) => obj?.[k], ctx.data);
                    return dataVal == val;
                });
                if (!filterMatch)
                    continue;
            }
            // 2. Create execution log
            log = await automation_model_1.ExecutionLogModel.create({
                automation: automation._id,
                triggerData: ctx,
                steps: automation.steps.map((s) => ({
                    stepId: s.id,
                    status: "pending",
                    actions: [],
                })),
                overallStatus: "running",
                startedAt: new Date(),
            });
            let overallSuccess = true;
            // 3. Execute steps sequentially
            for (const step of automation.steps) {
                console.log(`[Automation] Running step: ${step.label || step.id}`);
                await automation_model_1.ExecutionLogModel.updateOne({ _id: log._id, "steps.stepId": step.id }, { $set: { "steps.$.status": "running" } });
                // Apply delay
                if (step.delayMs > 0) {
                    await new Promise((resolve) => setTimeout(resolve, step.delayMs));
                }
                // Evaluate condition groups
                let conditionsMet = true;
                if (step.conditionGroups?.length) {
                    conditionsMet = step.conditionGroups.every((group) => {
                        const result = group.conditions.some((cond) => {
                            const fieldVal = cond.field
                                .split(".")
                                .reduce((obj, k) => obj?.[k], ctx.data);
                            return evaluateCondition(fieldVal, cond.operator, cond.value);
                        });
                        return group.logicalOperator === "OR"
                            ? result
                            : !result
                                ? false
                                : result;
                    });
                }
                if (!conditionsMet) {
                    await automation_model_1.ExecutionLogModel.updateOne({ _id: log._id, "steps.stepId": step.id }, { $set: { "steps.$.status": "skipped" } });
                    continue; // skip to next step
                }
                // Execute actions in parallel
                const actionResults = await Promise.allSettled(step.actions.map((action) => executeAction(action, ctx)));
                const stepSuccess = actionResults.every((r) => r.status === "fulfilled");
                const stepLogActions = step.actions.map((action, i) => ({
                    type: action.type,
                    status: actionResults[i]?.status === "fulfilled"
                        ? "success"
                        : "failure",
                    message: actionResults[i]?.status === "fulfilled"
                        ? "OK"
                        : actionResults[i].reason?.message ||
                            "Error",
                }));
                await automation_model_1.ExecutionLogModel.updateOne({ _id: log._id, "steps.stepId": step.id }, {
                    $set: {
                        "steps.$.status": stepSuccess ? "success" : "failure",
                        "steps.$.actions": stepLogActions,
                    },
                });
                // If step failed and retry is off, break the loop
                if (!stepSuccess && !step.retryOnFailure) {
                    console.error(`[Automation] Step "${step.id}" failed – stopping sequence.`);
                    overallSuccess = false;
                    break;
                }
            }
            // 4. Finalise log and update automation
            await automation_model_1.ExecutionLogModel.findByIdAndUpdate(log._id, {
                overallStatus: overallSuccess ? "success" : "failure",
                completedAt: new Date(),
            });
            await automation_model_1.AutomationModel.findByIdAndUpdate(automation._id, {
                lastExecutedAt: new Date(),
            });
        }
        catch (err) {
            console.error(`[Automation] Fatal error for automation ${automation._id}:`, err);
            if (log) {
                await automation_model_1.ExecutionLogModel.findByIdAndUpdate(log._id, {
                    overallStatus: "failure",
                    errorMessage: err?.message,
                    completedAt: new Date(),
                });
            }
        }
    }
}
// ── Helpers ──────────────────────────────────────────────
function evaluateCondition(fieldValue, operator, conditionValue) {
    switch (operator) {
        case "equals":
            return fieldValue == conditionValue;
        case "not_equals":
            return fieldValue != conditionValue;
        case "contains":
            return String(fieldValue).includes(String(conditionValue));
        case "greater_than":
            return Number(fieldValue) > Number(conditionValue);
        case "less_than":
            return Number(fieldValue) < Number(conditionValue);
        case "is_empty":
            return (fieldValue === "" ||
                fieldValue === null ||
                fieldValue === undefined);
        case "is_not_empty":
            return !(fieldValue === "" ||
                fieldValue === null ||
                fieldValue === undefined);
        case "regex":
            return new RegExp(conditionValue).test(String(fieldValue));
        default:
            return false;
    }
}
function resolvePlaceholders(template, ctx) {
    if (typeof template === "string") {
        return template.replace(/\{\{(.*?)\}\}/g, (_, path) => {
            return (path
                .trim()
                .split(".")
                .reduce((obj, k) => obj?.[k], ctx) ?? "");
        });
    }
    if (Array.isArray(template))
        return template.map((item) => resolvePlaceholders(item, ctx));
    if (typeof template === "object" && template !== null) {
        return Object.fromEntries(Object.entries(template).map(([k, v]) => [
            k,
            resolvePlaceholders(v, ctx),
        ]));
    }
    return template;
}
async function executeAction(action, ctx) {
    const config = resolvePlaceholders(action.config, ctx);
    switch (action.type) {
        case "send_email":
            console.log(`[Email] To: ${config.to} – ${config.subject}`);
            break;
        case "send_sms":
            console.log(`[SMS] To: ${config.to} – ${config.message}`);
            break;
        case "add_tag":
            console.log(`[Tag] Add "${config.tag}" to user ${ctx.user?.id}`);
            break;
        case "assign_role":
            console.log(`[Role] Assign "${config.role}" to user ${ctx.user?.id}`);
            break;
        case "send_webhook":
            console.log(`[Webhook] ${config.method || "POST"} ${config.url}`);
            break;
        case "update_submission_status": {
            const submissionId = ctx.data.submissionId;
            if (!submissionId) {
                throw new Error("Missing submissionId in automation context");
            }
            const submission = await submission_model_1.default.findById(submissionId);
            if (!submission) {
                throw new Error(`Submission ${submissionId} not found`);
            }
            const newStatus = config.status || "reviewed";
            if (!["new", "reviewed", "processed", "failed"].includes(newStatus)) {
                throw new Error(`Invalid status: ${newStatus}`);
            }
            submission.status = newStatus;
            await submission.save();
            console.log(`[Automation] Updated submission ${submissionId} status to ${newStatus}`);
            break;
        }
        case "ai_generate":
            console.log(`[AI] Prompt: ${config.prompt?.substring(0, 80)}...`);
            break;
        case "wait":
            // No‑op – used only when delayMs is not enough; just resolve.
            break;
        default:
            throw new Error(`Unknown action type: ${action.type}`);
    }
}
