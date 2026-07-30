import FormModel from "./form.model";
import { IForm } from "./form.interface";
import { validateFormSchema, validateConditionalRules } from "../shared/validation.utils";

class FormService {
  async createForm(payload: Partial<IForm>): Promise<IForm> {
    const existing = await FormModel.findOne({ key: payload.key });
    if (existing) throw new Error(`Form with key "${payload.key}" already exists`);

    const errors = validateFormSchema(payload.fields ?? [], payload.layout ?? []);
    if (errors.length) throw new Error(errors.join(", "));

    if (payload.conditions?.length) {
      const condErrors = validateConditionalRules(payload.conditions, payload.fields ?? []);
      if (condErrors.length) throw new Error(condErrors.join(", "));
    }

    const form = new FormModel(payload);
    await form.save();
    return form;
  }

  async getAllForms(filters: Record<string, any> = {}) {
    return FormModel.find(filters).sort({ createdAt: -1 }).lean() as unknown as IForm[];
  }

  async getFormById(id: string) {
    return FormModel.findById(id).lean();
  }

  async getFormByKey(key: string) {
    return FormModel.findOne({ key }).lean();
  }

  async getPublicFormByKey(key: string) {
    return FormModel.findOne({ key, enabled: true }).lean();
  }

  async updateForm(id: string, payload: Partial<IForm>) {
    const form = await FormModel.findById(id);
    if (!form) return null;

    if (payload.key && payload.key !== form.key) {
      const dup = await FormModel.findOne({ key: payload.key, _id: { $ne: id } });
      if (dup) throw new Error(`Form with key "${payload.key}" already exists`);
    }

    const nextFields = payload.fields ?? form.fields;
    const nextLayout = payload.layout ?? form.layout;
    const nextConditions = payload.conditions ?? form.conditions;

    const errors = validateFormSchema(nextFields as any, nextLayout as any);
    if (errors.length) throw new Error(errors.join(", "));

    if (nextConditions?.length) {
      const condErrors = validateConditionalRules(nextConditions, nextFields as any);
      if (condErrors.length) throw new Error(condErrors.join(", "));
    }

    Object.assign(form, payload);
    await form.save();
    return form.toObject();
  }

  async deleteForm(id: string) {
    return FormModel.findByIdAndDelete(id).lean();
  }

  async toggleForm(id: string) {
    const form = await FormModel.findById(id);
    if (!form) throw new Error("Form not found");
    form.enabled = !form.enabled;
    await form.save();
    return form.toObject();
  }

  async incrementSubmissionCount(id: string) {
    await FormModel.findByIdAndUpdate(id, { $inc: { submissionCount: 1 } });
  }

  async duplicateForm(id: string): Promise<IForm | null> {
    const original = await FormModel.findById(id);
    if (!original) return null;

    const newKey = `${original.key}_copy_${Date.now()}`;
    const duplicate = {
      ...original.toObject(),
      _id: undefined,
      key: newKey,
      name: `${original.name} (Copy)`,
      isTemplate: false,
      createdAt: undefined,
      updatedAt: undefined,
    };
    return FormModel.create(duplicate);
  }

  async getFormAnalytics(id: string): Promise<any> {
    const form = await FormModel.findById(id).select("submissionCount").lean<{submissionCount: number}>();
    if (!form) return null;
    // In a real app, query a submissions collection
    return {
      views: 0,
      submissions: form?.submissionCount ?? 0,
      conversionRate: 0,
    };
  }

}

export default new FormService();