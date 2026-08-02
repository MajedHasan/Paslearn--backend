"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createThemeController = createThemeController;
exports.getAllThemesController = getAllThemesController;
exports.getActiveThemesController = getActiveThemesController;
exports.getThemeByIdController = getThemeByIdController;
exports.getThemeBySlugController = getThemeBySlugController;
exports.updateThemeController = updateThemeController;
exports.deleteThemeController = deleteThemeController;
exports.toggleThemeActiveController = toggleThemeActiveController;
const theme_service_1 = require("./theme.service");
async function createThemeController(req, res, next) {
    try {
        const theme = await (0, theme_service_1.createTheme)(req.body);
        return res.status(201).json({ success: true, message: "Theme created", data: theme });
    }
    catch (error) {
        next(error);
    }
}
async function getAllThemesController(req, res, next) {
    try {
        const themes = await (0, theme_service_1.getAllThemes)(req.query);
        return res.status(200).json({ success: true, data: themes });
    }
    catch (error) {
        next(error);
    }
}
async function getActiveThemesController(req, res, next) {
    try {
        const themes = await (0, theme_service_1.getActiveThemes)();
        return res.status(200).json({ success: true, data: themes });
    }
    catch (error) {
        next(error);
    }
}
async function getThemeByIdController(req, res, next) {
    try {
        const theme = await (0, theme_service_1.getThemeById)(req.params.id);
        if (!theme)
            return res.status(404).json({ success: false, message: "Theme not found" });
        return res.status(200).json({ success: true, data: theme });
    }
    catch (error) {
        next(error);
    }
}
async function getThemeBySlugController(req, res, next) {
    try {
        const theme = await (0, theme_service_1.getThemeBySlug)(req.params.slug);
        if (!theme)
            return res.status(404).json({ success: false, message: "Theme not found" });
        return res.status(200).json({ success: true, data: theme });
    }
    catch (error) {
        next(error);
    }
}
async function updateThemeController(req, res, next) {
    try {
        const theme = await (0, theme_service_1.updateTheme)(req.params.id, req.body);
        if (!theme)
            return res.status(404).json({ success: false, message: "Theme not found" });
        return res.status(200).json({ success: true, message: "Theme updated", data: theme });
    }
    catch (error) {
        next(error);
    }
}
async function deleteThemeController(req, res, next) {
    try {
        const theme = await (0, theme_service_1.deleteTheme)(req.params.id);
        if (!theme)
            return res.status(404).json({ success: false, message: "Theme not found" });
        return res.status(200).json({ success: true, message: "Theme deleted" });
    }
    catch (error) {
        next(error);
    }
}
async function toggleThemeActiveController(req, res, next) {
    try {
        const theme = await (0, theme_service_1.toggleThemeActive)(req.params.id);
        return res.status(200).json({
            success: true,
            message: `Theme ${theme?.isActive ? "activated" : "deactivated"}`,
            data: theme,
        });
    }
    catch (error) {
        next(error);
    }
}
