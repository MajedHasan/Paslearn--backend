"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createExperienceController = createExperienceController;
exports.getAllExperiencesController = getAllExperiencesController;
exports.getExperienceByIdController = getExperienceByIdController;
exports.updateExperienceController = updateExperienceController;
exports.deleteExperienceController = deleteExperienceController;
exports.toggleExperienceController = toggleExperienceController;
exports.getActiveExperiencesController = getActiveExperiencesController;
exports.getExperienceByKeyController = getExperienceByKeyController;
exports.getExperienceAnalyticsController = getExperienceAnalyticsController;
exports.recordImpressionController = recordImpressionController;
const experience_service_1 = require("./experience.service");
/*
|--------------------------------------------------------------------------
| Create Experience
|--------------------------------------------------------------------------
*/
async function createExperienceController(req, res, next) {
    try {
        const experience = await (0, experience_service_1.createExperience)(req.body);
        return res.status(201).json({
            success: true,
            message: "Experience created successfully",
            data: experience,
        });
    }
    catch (error) {
        next(error);
    }
}
/*
|--------------------------------------------------------------------------
| Get All Experiences (Admin)
|--------------------------------------------------------------------------
*/
async function getAllExperiencesController(req, res, next) {
    try {
        const experiences = await (0, experience_service_1.getAllExperiences)(req.query);
        return res.status(200).json({
            success: true,
            data: experiences,
        });
    }
    catch (error) {
        next(error);
    }
}
/*
|--------------------------------------------------------------------------
| Get Single Experience
|--------------------------------------------------------------------------
*/
async function getExperienceByIdController(req, res, next) {
    try {
        const { id } = req.params;
        const experience = await (0, experience_service_1.getExperienceById)(id);
        if (!experience) {
            return res.status(404).json({
                success: false,
                message: "Experience not found",
            });
        }
        return res.status(200).json({
            success: true,
            data: experience,
        });
    }
    catch (error) {
        next(error);
    }
}
/*
|--------------------------------------------------------------------------
| Update Experience
|--------------------------------------------------------------------------
*/
async function updateExperienceController(req, res, next) {
    try {
        const { id } = req.params;
        const experience = await (0, experience_service_1.updateExperience)(id, req.body);
        if (!experience) {
            return res.status(404).json({
                success: false,
                message: "Experience not found",
            });
        }
        return res.status(200).json({
            success: true,
            message: "Experience updated successfully",
            data: experience,
        });
    }
    catch (error) {
        next(error);
    }
}
/*
|--------------------------------------------------------------------------
| Delete Experience
|--------------------------------------------------------------------------
*/
async function deleteExperienceController(req, res, next) {
    try {
        const { id } = req.params;
        const experience = await (0, experience_service_1.deleteExperience)(id);
        if (!experience) {
            return res.status(404).json({
                success: false,
                message: "Experience not found",
            });
        }
        return res.status(200).json({
            success: true,
            message: "Experience deleted successfully",
        });
    }
    catch (error) {
        next(error);
    }
}
/*
|--------------------------------------------------------------------------
| Toggle Experience
|--------------------------------------------------------------------------
*/
async function toggleExperienceController(req, res, next) {
    try {
        const { id } = req.params;
        const experience = await (0, experience_service_1.toggleExperience)(id);
        return res.status(200).json({
            success: true,
            message: "Experience status updated successfully",
            data: experience,
        });
    }
    catch (error) {
        next(error);
    }
}
/*
|--------------------------------------------------------------------------
| Public Runtime Experiences
|--------------------------------------------------------------------------
*/
async function getActiveExperiencesController(req, res, next) {
    try {
        const experiences = await (0, experience_service_1.getActiveExperiences)();
        return res.status(200).json({
            success: true,
            data: experiences,
        });
    }
    catch (error) {
        console.error("Experience fetch failed:", error);
        next(error);
    }
}
/*
|--------------------------------------------------------------------------
| Get Experience By Key
|--------------------------------------------------------------------------
*/
async function getExperienceByKeyController(req, res, next) {
    try {
        const { key } = req.params;
        const experience = await (0, experience_service_1.getExperienceByKey)(key);
        if (!experience) {
            return res.status(404).json({
                success: false,
                message: "Experience not found",
            });
        }
        return res.status(200).json({
            success: true,
            data: experience,
        });
    }
    catch (error) {
        next(error);
    }
}
/*
|--------------------------------------------------------------------------
| Get Experience Analytics (Admin)
|--------------------------------------------------------------------------
*/
async function getExperienceAnalyticsController(req, res, next) {
    try {
        const { id } = req.params;
        const days = req.query.days ? Number(req.query.days) : 30;
        const analytics = await (0, experience_service_1.getExperienceAnalytics)(id, { days });
        return res.status(200).json({ success: true, data: analytics });
    }
    catch (error) {
        next(error);
    }
}
async function recordImpressionController(req, res, next) {
    try {
        const { experienceId, action, sessionId, device, referrer, metadata } = req.body;
        if (!experienceId || !["view", "click", "close", "convert"].includes(action)) {
            return res.status(400).json({ success: false, message: "Invalid payload" });
        }
        await (0, experience_service_1.recordImpression)(experienceId, action, {
            sessionId,
            device,
            referrer,
            metadata,
        });
        return res.status(201).json({ success: true });
    }
    catch (error) {
        next(error);
    }
}
