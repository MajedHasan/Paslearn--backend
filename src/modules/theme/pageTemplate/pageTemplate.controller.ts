import { Request, Response, NextFunction } from "express";
import {
    createPageTemplate,
    getAllPageTemplates,
    getPageTemplateById,
    updatePageTemplate,
    deletePageTemplate,
    getPageTemplateBySlug
} from "./pageTemplate.service";

export async function createPageTemplateController(req: Request, res: Response, next: NextFunction) {
    try {
        const pageTemplate = await createPageTemplate(req.body);
        return res.status(201).json({ success: true, message: "Page template created", data: pageTemplate });
    } catch (error) {
        next(error);
    }
}

export async function getAllPageTemplatesController(req: Request, res: Response, next: NextFunction) {
    try {
        const pageTemplates = await getAllPageTemplates(req.query as Record<string, any>);
        return res.status(200).json({ success: true, data: pageTemplates });
    } catch (error) {
        next(error);
    }
}

export async function getPageTemplateByIdController(req: Request, res: Response, next: NextFunction) {
    try {
        const pageTemplate = await getPageTemplateById(req.params.id);
        if (!pageTemplate) return res.status(404).json({ success: false, message: "Page template not found" });
        return res.status(200).json({ success: true, data: pageTemplate });
    } catch (error) {
        next(error);
    }
}

export async function getPageTemplateBySlugController(req: Request, res: Response, next: NextFunction) {
    try {
        const pageTemplate = await getPageTemplateBySlug(req.params.slug);
        if (!pageTemplate) return res.status(404).json({ success: false, message: "Page template not found" });
        return res.status(200).json({ success: true, data: pageTemplate });
    } catch (error) {
        next(error);
    }
}

export async function updatePageTemplateController(req: Request, res: Response, next: NextFunction) {
    try {
        const pageTemplate = await updatePageTemplate(req.params.id, req.body);
        if (!pageTemplate) return res.status(404).json({ success: false, message: "Page template not found" });
        return res.status(200).json({ success: true, message: "Page template updated", data: pageTemplate });
    } catch (error) {
        next(error);
    }
}

export async function deletePageTemplateController(req: Request, res: Response, next: NextFunction) {
    try {
        const pageTemplate = await deletePageTemplate(req.params.id);
        if (!pageTemplate) return res.status(404).json({ success: false, message: "Page template not found" });
        return res.status(200).json({ success: true, message: "Page template deleted", data: pageTemplate });
    } catch (error) {
        next(error);
    }
}   