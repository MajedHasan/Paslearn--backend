"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFeatureController = createFeatureController;
exports.getAllFeaturesController = getAllFeaturesController;
exports.getFeatureByIdController = getFeatureByIdController;
exports.updateFeatureController = updateFeatureController;
exports.deleteFeatureController = deleteFeatureController;
const planFeature_service_1 = require("./planFeature.service");
async function createFeatureController(req, res, next) {
    try {
        const feature = await (0, planFeature_service_1.createFeature)(req.body);
        return res.status(201).json({ success: true, message: "Feature created", data: feature });
    }
    catch (error) {
        next(error);
    }
}
async function getAllFeaturesController(req, res, next) {
    try {
        const features = await (0, planFeature_service_1.getAllFeatures)(req.query);
        return res.status(200).json({ success: true, data: features });
    }
    catch (error) {
        next(error);
    }
}
async function getFeatureByIdController(req, res, next) {
    try {
        const feature = await (0, planFeature_service_1.getFeatureById)(req.params.id);
        if (!feature)
            return res.status(404).json({ success: false, message: "Feature not found" });
        return res.status(200).json({ success: true, data: feature });
    }
    catch (error) {
        next(error);
    }
}
async function updateFeatureController(req, res, next) {
    try {
        const feature = await (0, planFeature_service_1.updateFeature)(req.params.id, req.body);
        if (!feature)
            return res.status(404).json({ success: false, message: "Feature not found" });
        return res.status(200).json({ success: true, message: "Feature updated", data: feature });
    }
    catch (error) {
        next(error);
    }
}
async function deleteFeatureController(req, res, next) {
    try {
        const feature = await (0, planFeature_service_1.deleteFeature)(req.params.id);
        if (!feature)
            return res.status(404).json({ success: false, message: "Feature not found" });
        return res.status(200).json({ success: true, message: "Feature deleted" });
    }
    catch (error) {
        next(error);
    }
}
