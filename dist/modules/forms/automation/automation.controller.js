"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAutomationController = createAutomationController;
exports.getAllAutomationsController = getAllAutomationsController;
exports.getAutomationByIdController = getAutomationByIdController;
exports.updateAutomationController = updateAutomationController;
exports.deleteAutomationController = deleteAutomationController;
exports.toggleAutomationController = toggleAutomationController;
const automation_service_1 = require("./automation.service");
async function createAutomationController(req, res, next) {
    try {
        const automation = await (0, automation_service_1.createAutomation)(req.body);
        return res
            .status(201)
            .json({ success: true, message: "Automation created", data: automation });
    }
    catch (error) {
        next(error);
    }
}
async function getAllAutomationsController(req, res, next) {
    try {
        const automations = await (0, automation_service_1.getAllAutomations)(req.query);
        return res.status(200).json({ success: true, data: automations });
    }
    catch (error) {
        next(error);
    }
}
async function getAutomationByIdController(req, res, next) {
    try {
        const automation = await (0, automation_service_1.getAutomationById)(req.params.id);
        if (!automation)
            return res
                .status(404)
                .json({ success: false, message: "Automation not found" });
        return res.status(200).json({ success: true, data: automation });
    }
    catch (error) {
        next(error);
    }
}
async function updateAutomationController(req, res, next) {
    try {
        const automation = await (0, automation_service_1.updateAutomation)(req.params.id, req.body);
        if (!automation)
            return res
                .status(404)
                .json({ success: false, message: "Automation not found" });
        return res
            .status(200)
            .json({ success: true, message: "Automation updated", data: automation });
    }
    catch (error) {
        next(error);
    }
}
async function deleteAutomationController(req, res, next) {
    try {
        const automation = await (0, automation_service_1.deleteAutomation)(req.params.id);
        if (!automation)
            return res
                .status(404)
                .json({ success: false, message: "Automation not found" });
        return res
            .status(200)
            .json({ success: true, message: "Automation deleted" });
    }
    catch (error) {
        next(error);
    }
}
async function toggleAutomationController(req, res, next) {
    try {
        const automation = await (0, automation_service_1.toggleAutomation)(req.params.id);
        return res.status(200).json({
            success: true,
            message: `Automation ${automation.enabled ? "enabled" : "disabled"}`,
            data: automation,
        });
    }
    catch (error) {
        next(error);
    }
}
