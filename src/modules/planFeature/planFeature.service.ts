import PlanFeatureModel from "./planFeature.model";
import { IPlanFeatureTemplate } from "./planFeature.interface";

export async function createFeature(payload: Partial<IPlanFeatureTemplate>): Promise<IPlanFeatureTemplate> {
  const existing = await PlanFeatureModel.findOne({ key: payload.key });
  if (existing) throw new Error(`Feature with key "${payload.key}" already exists`);
  return PlanFeatureModel.create(payload);
}

export async function getAllFeatures(filter: Record<string, any> = {}): Promise<IPlanFeatureTemplate[]> {
  return PlanFeatureModel.find(filter)
    .sort({ label: 1 })
    .lean() as unknown as IPlanFeatureTemplate[];
}

export async function getFeatureById(id: string): Promise<IPlanFeatureTemplate | null> {
  return PlanFeatureModel.findById(id).lean();
}

export async function updateFeature(
  id: string,
  payload: Partial<IPlanFeatureTemplate>
): Promise<IPlanFeatureTemplate | null> {
  const feature = await PlanFeatureModel.findById(id);
  if (!feature) return null;
  if (payload.key && payload.key !== feature.key) {
    const existing = await PlanFeatureModel.findOne({ key: payload.key, _id: { $ne: id } });
    if (existing) throw new Error(`Feature with key "${payload.key}" already exists`);
  }
  Object.assign(feature, payload);
  await feature.save();
  return feature.toObject();
}

export async function deleteFeature(id: string): Promise<IPlanFeatureTemplate | null> {
  return PlanFeatureModel.findByIdAndDelete(id).lean();
}