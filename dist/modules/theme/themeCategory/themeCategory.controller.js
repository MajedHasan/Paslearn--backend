"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createThemeCategoryController = createThemeCategoryController;
exports.getAllThemeCategoriesController = getAllThemeCategoriesController;
exports.getThemeCategoryByIdController = getThemeCategoryByIdController;
exports.updateThemeCategoryController = updateThemeCategoryController;
exports.deleteThemeCategoryController = deleteThemeCategoryController;
const themeCategory_service_1 = require("./themeCategory.service");
async function createThemeCategoryController(req, res, next) {
    try {
        const category = await (0, themeCategory_service_1.createThemeCategory)(req.body);
        return res.status(201).json({ success: true, message: "Theme category created", data: category });
    }
    catch (error) {
        next(error);
    }
}
async function getAllThemeCategoriesController(req, res, next) {
    try {
        const categories = await (0, themeCategory_service_1.getAllThemeCategories)();
        return res.status(200).json({ success: true, data: categories });
    }
    catch (error) {
        next(error);
    }
}
async function getThemeCategoryByIdController(req, res, next) {
    try {
        const category = await (0, themeCategory_service_1.getThemeCategoryById)(req.params.id);
        if (!category)
            return res.status(404).json({ success: false, message: "Theme category not found" });
        return res.status(200).json({ success: true, data: category });
    }
    catch (error) {
        next(error);
    }
}
async function updateThemeCategoryController(req, res, next) {
    try {
        const category = await (0, themeCategory_service_1.updateThemeCategory)(req.params.id, req.body);
        if (!category)
            return res.status(404).json({ success: false, message: "Theme category not found" });
        return res.status(200).json({ success: true, message: "Theme category updated", data: category });
    }
    catch (error) {
        next(error);
    }
}
async function deleteThemeCategoryController(req, res, next) {
    try {
        const category = await (0, themeCategory_service_1.deleteThemeCategory)(req.params.id);
        if (!category)
            return res.status(404).json({ success: false, message: "Theme category not found" });
        return res.status(200).json({ success: true, message: "Theme category deleted", data: category });
    }
    catch (error) {
        next(error);
    }
}
