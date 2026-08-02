"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPageTemplateController = createPageTemplateController;
exports.getAllPageTemplatesController = getAllPageTemplatesController;
exports.getPageTemplateByIdController = getPageTemplateByIdController;
exports.getPageTemplateBySlugController = getPageTemplateBySlugController;
exports.updatePageTemplateController = updatePageTemplateController;
exports.deletePageTemplateController = deletePageTemplateController;
const pageTemplate_service_1 = require("./pageTemplate.service");
async function createPageTemplateController(req, res, next) {
    try {
        const pageTemplate = await (0, pageTemplate_service_1.createPageTemplate)(req.body);
        return res.status(201).json({ success: true, message: "Page template created", data: pageTemplate });
    }
    catch (error) {
        next(error);
    }
}
async function getAllPageTemplatesController(req, res, next) {
    try {
        const pageTemplates = await (0, pageTemplate_service_1.getAllPageTemplates)(req.query);
        return res.status(200).json({ success: true, data: pageTemplates });
    }
    catch (error) {
        next(error);
    }
}
async function getPageTemplateByIdController(req, res, next) {
    try {
        const pageTemplate = await (0, pageTemplate_service_1.getPageTemplateById)(req.params.id);
        if (!pageTemplate)
            return res.status(404).json({ success: false, message: "Page template not found" });
        return res.status(200).json({ success: true, data: pageTemplate });
    }
    catch (error) {
        next(error);
    }
}
async function getPageTemplateBySlugController(req, res, next) {
    try {
        const pageTemplate = await (0, pageTemplate_service_1.getPageTemplateBySlug)(req.params.slug);
        if (!pageTemplate)
            return res.status(404).json({ success: false, message: "Page template not found" });
        return res.status(200).json({ success: true, data: pageTemplate });
    }
    catch (error) {
        next(error);
    }
}
async function updatePageTemplateController(req, res, next) {
    try {
        const pageTemplate = await (0, pageTemplate_service_1.updatePageTemplate)(req.params.id, req.body);
        if (!pageTemplate)
            return res.status(404).json({ success: false, message: "Page template not found" });
        return res.status(200).json({ success: true, message: "Page template updated", data: pageTemplate });
    }
    catch (error) {
        next(error);
    }
}
async function deletePageTemplateController(req, res, next) {
    try {
        const pageTemplate = await (0, pageTemplate_service_1.deletePageTemplate)(req.params.id);
        if (!pageTemplate)
            return res.status(404).json({ success: false, message: "Page template not found" });
        return res.status(200).json({ success: true, message: "Page template deleted", data: pageTemplate });
    }
    catch (error) {
        next(error);
    }
}
