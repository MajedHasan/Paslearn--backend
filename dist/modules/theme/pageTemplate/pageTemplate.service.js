"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPageTemplate = createPageTemplate;
exports.getAllPageTemplates = getAllPageTemplates;
exports.getPageTemplateById = getPageTemplateById;
exports.getPageTemplateBySlug = getPageTemplateBySlug;
exports.updatePageTemplate = updatePageTemplate;
exports.deletePageTemplate = deletePageTemplate;
const pageTemplate_model_1 = __importDefault(require("./pageTemplate.model"));
async function createPageTemplate(payload) {
    return pageTemplate_model_1.default.create(payload);
}
async function getAllPageTemplates(filter = {}) {
    return pageTemplate_model_1.default.find(filter).sort({ name: 1 }).lean();
}
async function getPageTemplateById(id) {
    return pageTemplate_model_1.default.findById(id).lean();
}
async function getPageTemplateBySlug(slug) {
    return pageTemplate_model_1.default.findOne({ slug }).lean();
}
async function updatePageTemplate(id, payload) {
    const page = await pageTemplate_model_1.default.findById(id);
    if (!page)
        return null;
    Object.assign(page, payload);
    await page.save();
    return page.toObject();
}
async function deletePageTemplate(id) {
    return pageTemplate_model_1.default.findByIdAndDelete(id).lean();
}
