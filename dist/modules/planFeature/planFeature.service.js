"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFeature = createFeature;
exports.getAllFeatures = getAllFeatures;
exports.getFeatureById = getFeatureById;
exports.updateFeature = updateFeature;
exports.deleteFeature = deleteFeature;
const planFeature_model_1 = __importDefault(require("./planFeature.model"));
async function createFeature(payload) {
    const existing = await planFeature_model_1.default.findOne({ key: payload.key });
    if (existing)
        throw new Error(`Feature with key "${payload.key}" already exists`);
    return planFeature_model_1.default.create(payload);
}
async function getAllFeatures(filter = {}) {
    return planFeature_model_1.default.find(filter)
        .sort({ label: 1 })
        .lean();
}
async function getFeatureById(id) {
    return planFeature_model_1.default.findById(id).lean();
}
async function updateFeature(id, payload) {
    const feature = await planFeature_model_1.default.findById(id);
    if (!feature)
        return null;
    if (payload.key && payload.key !== feature.key) {
        const existing = await planFeature_model_1.default.findOne({ key: payload.key, _id: { $ne: id } });
        if (existing)
            throw new Error(`Feature with key "${payload.key}" already exists`);
    }
    Object.assign(feature, payload);
    await feature.save();
    return feature.toObject();
}
async function deleteFeature(id) {
    return planFeature_model_1.default.findByIdAndDelete(id).lean();
}
