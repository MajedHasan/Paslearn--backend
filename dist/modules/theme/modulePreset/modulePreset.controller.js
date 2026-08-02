"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createModulePresetController = createModulePresetController;
exports.getAllModulePresetsController = getAllModulePresetsController;
exports.getModulePresetByIdController = getModulePresetByIdController;
exports.updateModulePresetController = updateModulePresetController;
exports.deleteModulePresetController = deleteModulePresetController;
const modulePreset_service_1 = require("./modulePreset.service");
async function createModulePresetController(req, res, next) {
    try {
        const preset = await (0, modulePreset_service_1.createModulePreset)(req.body);
        return res.status(201).json({ success: true, message: "Module preset created", data: preset });
    }
    catch (error) {
        next(error);
    }
}
async function getAllModulePresetsController(req, res, next) {
    try {
        const presets = await (0, modulePreset_service_1.getAllModulePresets)(req.query);
        return res.status(200).json({ success: true, data: presets });
    }
    catch (error) {
        next(error);
    }
}
async function getModulePresetByIdController(req, res, next) {
    try {
        const preset = await (0, modulePreset_service_1.getModulePresetById)(req.params.id);
        if (!preset)
            return res.status(404).json({ success: false, message: "Module preset not found" });
        return res.status(200).json({ success: true, data: preset });
    }
    catch (error) {
        next(error);
    }
}
async function updateModulePresetController(req, res, next) {
    try {
        const preset = await (0, modulePreset_service_1.updateModulePreset)(req.params.id, req.body);
        if (!preset)
            return res.status(404).json({ success: false, message: "Module preset not found" });
        return res.status(200).json({ success: true, message: "Module preset updated", data: preset });
    }
    catch (error) {
        next(error);
    }
}
async function deleteModulePresetController(req, res, next) {
    try {
        const preset = await (0, modulePreset_service_1.deleteModulePreset)(req.params.id);
        if (!preset)
            return res.status(404).json({ success: false, message: "Module preset not found" });
        return res.status(200).json({ success: true, message: "Module preset deleted", data: preset });
    }
    catch (error) {
        next(error);
    }
}
