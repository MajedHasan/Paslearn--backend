import ThemeModel from "./theme.model";
import { ITheme } from "./theme.interface";

function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createTheme(payload: Partial<ITheme>): Promise<ITheme> {

  console.log("createTheme payload", payload);

  if (!payload.slug) {
    payload.slug = slugify(payload.name || "theme");
  }
  const existing = await ThemeModel.findOne({ slug: payload.slug });
  if (existing) throw new Error(`Theme with slug "${payload.slug}" already exists`);
  return ThemeModel.create(payload);
}

export async function getAllThemes(filter: Record<string, any> = {}) {
  return ThemeModel.find(filter)
    .populate("category", "name")
    .populate("pages", "name type")
    .populate("modules", "label type")
    .sort({ sortOrder: 1, createdAt: -1 })
    .lean();

}

export async function getActiveThemes() {
  return ThemeModel.find({ isActive: true })
    .populate("category", "name")
    .populate("pages", "name type content")
    .populate("modules", "label type config")
    .sort({ sortOrder: 1 })
    .lean();
}

export async function getThemeById(id: string) {
  if (!isValidObjectId(id)) return null;
  return ThemeModel.findById(id)
    .populate("category", "name")
    .populate("pages", "name type content")
    .populate("modules", "label type config")
    .lean();
}

export async function getThemeBySlug(slug: string) {
  return ThemeModel.findOne({ slug })
    .populate("category", "name")
    .populate("pages", "name type content")
    .populate("modules", "label type config")
    .lean();
}

export async function updateTheme(id: string, payload: Partial<ITheme>): Promise<ITheme | null> {
  const theme = await ThemeModel.findById(id);
  if (!theme) return null;

  if (payload.name && !payload.slug) {
    payload.slug = slugify(payload.name);
  }

  if (payload.slug && payload.slug !== theme.slug) {
    const existing = await ThemeModel.findOne({ slug: payload.slug, _id: { $ne: id } });
    if (existing) throw new Error(`Theme with slug "${payload.slug}" already exists`);
  }

  Object.assign(theme, payload);
  await theme.save();
  return theme.toObject();
}

export async function deleteTheme(id: string): Promise<ITheme | null> {
  return ThemeModel.findByIdAndDelete(id).lean();
}

export async function toggleThemeActive(id: string): Promise<ITheme | null> {
  const theme = await ThemeModel.findById(id);
  if (!theme) throw new Error("Theme not found");
  theme.isActive = !theme.isActive;
  await theme.save();
  return theme.toObject();
}