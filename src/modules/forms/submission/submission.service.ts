import FormModel from "../form/form.model";
import SubmissionModel from "./submission.model";
import { ISubmission } from "./submission.interface";
import { executeAutomations } from "../automation/automation.service";

class SubmissionService {
  /**
   * Create a new submission from public form data.
   * `payload.values` contains all field values (text).
   * `payload.files` is an array of uploaded file info.
   * `payload.meta` is browser metadata.
   */
  async createPublicSubmission(
    formKey: string,
    payload: {
      values: Record<string, any>;
      files?: {
        fieldKey: string;
        originalName: string;
        url: string;
        mimeType: string
      }[];
      meta?: Record<string, any>;
    },
    user?: any
  ) {
    // Find enabled form
    const form = await FormModel.findOne({ key: formKey, enabled: true }).lean();
    if (!form) throw new Error("Form not found or disabled");

    // Create submission
    const submission = await SubmissionModel.create({
      form: form._id,
      formKey: form.key,
      formSnapshot: {
        key: form.key,
        name: form.name,
        description: form.description,
        fields: form.fields,
        layout: form.layout,
        submitAction: form.submitAction,
        meta: form.meta,
      },
      values: payload.values || {},
      files: payload.files || [],
      meta: payload.meta || {},
      status: "new",
    });

    // Optionally increment submission count on form (if you have the field)
    await FormModel.findByIdAndUpdate(form._id, { $inc: { submissionCount: 1 } });

    try {
      await executeAutomations({
        resource: "form",
        event: "submitted",
        data: {
          formId: form._id.toString(),
          formKey: form.key,
          submissionId: submission._id.toString(),
          values: payload.values || {},
          files: payload.files || [],
          meta: payload.meta || {},
        },
        user: user || undefined,
      });
    } catch (err) {
      console.error("Automation execution failed:", err);
    }


    return submission;
  }

  async getAll(filters: Record<string, any> = {}) {
    return SubmissionModel.find(filters)
      .populate("form", "name key")
      .sort({ createdAt: -1 })
      .lean();
  }

  async getById(id: string) {
    return SubmissionModel.findById(id).populate("form", "name key").lean();
  }

  async updateStatus(id: string, status: string, notes?: string) {
    const sub = await SubmissionModel.findById(id);
    if (!sub) throw new Error("Submission not found");
    sub.status = status as any;
    if (notes) sub.notes = notes;
    await sub.save();
    return sub;
  }
}

export default new SubmissionService();