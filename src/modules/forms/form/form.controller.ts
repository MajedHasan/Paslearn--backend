import { Request, Response, NextFunction } from "express";
import FormService from "./form.service";

class FormController {
  async createForm(req: Request, res: Response, next: NextFunction) {
    try {
      const form = await FormService.createForm(req.body);

      return res.status(201).json({
        success: true,
        message: "Form created successfully",
        data: form,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllForms(req: Request, res: Response, next: NextFunction) {
    try {
      const forms = await FormService.getAllForms(
        req.query as Record<string, any>,
      );

      return res.status(200).json({
        success: true,
        data: forms,
      });
    } catch (error) {
      next(error);
    }
  }

  async getFormById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const form = await FormService.getFormById(id);

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
    } catch (error) {
      next(error);
    }
  }

  async getPublicFormByKey(req: Request, res: Response, next: NextFunction) {
    try {
      const { key } = req.params;
      const form = await FormService.getPublicFormByKey(key);

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
    } catch (error) {
      next(error);
    }
  }

  async updateForm(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const form = await FormService.updateForm(id, req.body);

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
    } catch (error) {
      next(error);
    }
  }

  async deleteForm(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const form = await FormService.deleteForm(id);

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
    } catch (error) {
      next(error);
    }
  }

  async toggleForm(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const form = await FormService.toggleForm(id);

      return res.status(200).json({
        success: true,
        message: "Form status updated successfully",
        data: form,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new FormController();
