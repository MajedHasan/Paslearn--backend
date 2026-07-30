import ModulePresetModel from "./modulePreset.model";
import { IModulePreset } from "./modulePreset.interface";

export async function createModulePreset(payload: Partial<IModulePreset>): Promise<IModulePreset> {
  return ModulePresetModel.create(payload);
}

export async function getAllModulePresets(filter: Record<string, any> = {}): Promise<IModulePreset[]> {
  return ModulePresetModel.find(filter).sort({ type: 1, key: 1 }).lean() as unknown as IModulePreset[];
}

export async function getModulePresetById(id: string): Promise<IModulePreset | null> {
  return ModulePresetModel.findById(id).lean();
}

export async function updateModulePreset(id: string, payload: Partial<IModulePreset>): Promise<IModulePreset | null> {
  const preset = await ModulePresetModel.findById(id);
  if (!preset) return null;
  Object.assign(preset, payload);
  await preset.save();
  return preset.toObject();
}

export async function deleteModulePreset(id: string): Promise<IModulePreset | null> {
  return ModulePresetModel.findByIdAndDelete(id).lean();
}