"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const submission_service_1 = __importDefault(require("./submission.service"));
class SubmissionController {
    async createPublicSubmission(req, res, next) {
        try {
            const { key } = req.params;
            // 1. Extract values from req.body (all non‑file fields)
            const values = { ...req.body };
            // Remove meta string if present (it's handled separately)
            delete values.meta;
            // 2. Parse meta
            let meta = {};
            if (req.body.meta) {
                try {
                    meta = JSON.parse(req.body.meta);
                }
                catch { }
            }
            // 3. Build file info array
            const files = [];
            const uploadedFiles = req.files;
            if (uploadedFiles && typeof uploadedFiles === "object") {
                for (const [fieldKey, fileArray] of Object.entries(uploadedFiles)) {
                    const file = fileArray[0];
                    if (file) {
                        files.push({
                            fieldKey,
                            originalName: file.originalname,
                            url: `/uploads/submissions/${file.filename}`,
                            mimeType: file.mimetype,
                        });
                    }
                }
            }
            const submission = await submission_service_1.default.createPublicSubmission(key, {
                values,
                files,
                meta,
            });
            return res.status(201).json({
                success: true,
                message: "Submitted successfully",
                data: submission,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getAll(req, res, next) {
        try {
            const subs = await submission_service_1.default.getAll(req.query);
            return res.status(200).json({ success: true, data: subs });
        }
        catch (error) {
            next(error);
        }
    }
    async getById(req, res, next) {
        try {
            const sub = await submission_service_1.default.getById(req.params.id);
            if (!sub)
                return res.status(404).json({ success: false, message: "Submission not found" });
            return res.status(200).json({ success: true, data: sub });
        }
        catch (error) {
            next(error);
        }
    }
    async updateStatus(req, res, next) {
        try {
            const { id } = req.params;
            const { status, notes } = req.body;
            const sub = await submission_service_1.default.updateStatus(id, status, notes);
            if (!sub)
                return res.status(404).json({ success: false, message: "Submission not found" });
            return res.status(200).json({ success: true, data: sub });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.default = new SubmissionController();
