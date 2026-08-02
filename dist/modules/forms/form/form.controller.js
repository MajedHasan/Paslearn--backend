"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const form_service_1 = __importDefault(require("./form.service"));
class FormController {
    async createForm(req, res, next) {
        try {
            const form = await form_service_1.default.createForm(req.body);
            return res.status(201).json({
                success: true,
                message: "Form created successfully",
                data: form,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getAllForms(req, res, next) {
        try {
            const forms = await form_service_1.default.getAllForms(req.query);
            return res.status(200).json({
                success: true,
                data: forms,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getFormById(req, res, next) {
        try {
            const { id } = req.params;
            const form = await form_service_1.default.getFormById(id);
            if (!form) {
                return res.status(404).json({
                    success: false,
                    message: "Form not found",
                });
            }
            return res.status(200).json({
                success: true,
                data: form,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getPublicFormByKey(req, res, next) {
        try {
            const { key } = req.params;
            const form = await form_service_1.default.getPublicFormByKey(key);
            if (!form) {
                return res.status(404).json({
                    success: false,
                    message: "Form not found",
                });
            }
            return res.status(200).json({
                success: true,
                data: form,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateForm(req, res, next) {
        try {
            const { id } = req.params;
            const form = await form_service_1.default.updateForm(id, req.body);
            if (!form) {
                return res.status(404).json({
                    success: false,
                    message: "Form not found",
                });
            }
            return res.status(200).json({
                success: true,
                message: "Form updated successfully",
                data: form,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async deleteForm(req, res, next) {
        try {
            const { id } = req.params;
            const form = await form_service_1.default.deleteForm(id);
            if (!form) {
                return res.status(404).json({
                    success: false,
                    message: "Form not found",
                });
            }
            return res.status(200).json({
                success: true,
                message: "Form deleted successfully",
            });
        }
        catch (error) {
            next(error);
        }
    }
    async toggleForm(req, res, next) {
        try {
            const { id } = req.params;
            const form = await form_service_1.default.toggleForm(id);
            return res.status(200).json({
                success: true,
                message: "Form status updated successfully",
                data: form,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.default = new FormController();
