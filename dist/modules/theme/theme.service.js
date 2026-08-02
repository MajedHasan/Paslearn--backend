"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTheme = createTheme;
exports.getAllThemes = getAllThemes;
exports.getActiveThemes = getActiveThemes;
exports.getThemeById = getThemeById;
exports.getThemeBySlug = getThemeBySlug;
exports.updateTheme = updateTheme;
exports.deleteTheme = deleteTheme;
exports.toggleThemeActive = toggleThemeActive;
const theme_model_1 = __importDefault(require("./theme.model"));
function isValidObjectId(id) {
    return /^[0-9a-fA-F]{24}$/.test(id);
}
function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^\w-]+/g, "")
        .replace(/--+/g, "-")
        .replace(/^-+|-+$/g, "");
}
async function createTheme(payload) {
    console.log("createTheme payload", payload);
    if (!payload.slug) {
        payload.slug = slugify(payload.name || "theme");
    }
    const existing = await theme_model_1.default.findOne({ slug: payload.slug });
    if (existing)
        throw new Error(`Theme with slug "${payload.slug}" already exists`);
    return theme_model_1.default.create(payload);
}
async function getAllThemes(filter = {}) {
    return theme_model_1.default.find(filter)
        .populate("category", "name")
        .populate("pages", "name type")
        .populate("modules", "label type")
        .sort({ sortOrder: 1, createdAt: -1 })
        .lean();
}
async function getActiveThemes() {
    return theme_model_1.default.find({ isActive: true })
        .populate("category", "name")
        .populate("pages", "name type content")
        .populate("modules", "label type config")
        .sort({ sortOrder: 1 })
        .lean();
}
async function getThemeById(id) {
    if (!isValidObjectId(id))
        return null;
    return theme_model_1.default.findById(id)
        .populate("category", "name")
        .populate("pages", "name type content")
        .populate("modules", "label type config")
        .lean();
}
async function getThemeBySlug(slug) {
    return theme_model_1.default.findOne({ slug })
        .populate("category", "name")
        .populate("pages", "name type content")
        .populate("modules", "label type config")
        .lean();
}
async function updateTheme(id, payload) {
    const theme = await theme_model_1.default.findById(id);
    if (!theme)
        return null;
    if (payload.name && !payload.slug) {
        payload.slug = slugify(payload.name);
    }
    if (payload.slug && payload.slug !== theme.slug) {
        const existing = await theme_model_1.default.findOne({ slug: payload.slug, _id: { $ne: id } });
        if (existing)
            throw new Error(`Theme with slug "${payload.slug}" already exists`);
    }
    Object.assign(theme, payload);
    await theme.save();
    return theme.toObject();
}
async function deleteTheme(id) {
    return theme_model_1.default.findByIdAndDelete(id).lean();
}
async function toggleThemeActive(id) {
    const theme = await theme_model_1.default.findById(id);
    if (!theme)
        throw new Error("Theme not found");
    theme.isActive = !theme.isActive;
    await theme.save();
    return theme.toObject();
}
