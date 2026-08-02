"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createModulePreset = createModulePreset;
exports.getAllModulePresets = getAllModulePresets;
exports.getModulePresetById = getModulePresetById;
exports.updateModulePreset = updateModulePreset;
exports.deleteModulePreset = deleteModulePreset;
const modulePreset_model_1 = __importDefault(require("./modulePreset.model"));
async function createModulePreset(payload) {
    return modulePreset_model_1.default.create(payload);
}
async function getAllModulePresets(filter = {}) {
    return modulePreset_model_1.default.find(filter).sort({ type: 1, key: 1 }).lean();
}
async function getModulePresetById(id) {
    return modulePreset_model_1.default.findById(id).lean();
}
async function updateModulePreset(id, payload) {
    const preset = await modulePreset_model_1.default.findById(id);
    if (!preset)
        return null;
    Object.assign(preset, payload);
    await preset.save();
    return preset.toObject();
}
async function deleteModulePreset(id) {
    return modulePreset_model_1.default.findByIdAndDelete(id).lean();
}
