import ThemeCategoryModel from "./themeCategory.model";
import { IThemeCategory } from "./themeCategory.interface";

export async function createThemeCategory(payload: Partial<IThemeCategory>): Promise<IThemeCategory> {
  const existing = await ThemeCategoryModel.findOne({ slug: payload.slug });
  if (existing) throw new Error("Category slug already exists");
  return ThemeCategoryModel.create(payload);
}

export async function getAllThemeCategories(): Promise<IThemeCategory[]> {
  return ThemeCategoryModel.find().sort({ name: 1 }).lean() as unknown as IThemeCategory[];
}

export async function getThemeCategoryById(id: string): Promise<IThemeCategory | null> {
  return ThemeCategoryModel.findById(id).lean();
}

export async function updateThemeCategory(id: string, payload: Partial<IThemeCategory>): Promise<IThemeCategory | null> {
  const cat = await ThemeCategoryModel.findById(id);
  if (!cat) return null;
  if (payload.slug && payload.slug !== cat.slug) {
    const existing = await ThemeCategoryModel.findOne({ slug: payload.slug, _id: { $ne: id } });
    if (existing) throw new Error("Category slug already exists");
  }
  Object.assign(cat, payload);
  await cat.save();
  return cat.toObject();
}

export async function deleteThemeCategory(id: string): Promise<IThemeCategory | null> {
  return ThemeCategoryModel.findByIdAndDelete(id).lean();
}