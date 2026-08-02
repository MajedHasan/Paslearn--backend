"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createThemeCategory = createThemeCategory;
exports.getAllThemeCategories = getAllThemeCategories;
exports.getThemeCategoryById = getThemeCategoryById;
exports.updateThemeCategory = updateThemeCategory;
exports.deleteThemeCategory = deleteThemeCategory;
const themeCategory_model_1 = __importDefault(require("./themeCategory.model"));
async function createThemeCategory(payload) {
    const existing = await themeCategory_model_1.default.findOne({ slug: payload.slug });
    if (existing)
        throw new Error("Category slug already exists");
    return themeCategory_model_1.default.create(payload);
}
async function getAllThemeCategories() {
    return themeCategory_model_1.default.find().sort({ name: 1 }).lean();
}
async function getThemeCategoryById(id) {
    return themeCategory_model_1.default.findById(id).lean();
}
async function updateThemeCategory(id, payload) {
    const cat = await themeCategory_model_1.default.findById(id);
    if (!cat)
        return null;
    if (payload.slug && payload.slug !== cat.slug) {
        const existing = await themeCategory_model_1.default.findOne({ slug: payload.slug, _id: { $ne: id } });
        if (existing)
            throw new Error("Category slug already exists");
    }
    Object.assign(cat, payload);
    await cat.save();
    return cat.toObject();
}
async function deleteThemeCategory(id) {
    return themeCategory_model_1.default.findByIdAndDelete(id).lean();
}
