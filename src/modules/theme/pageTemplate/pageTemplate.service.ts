import PageTemplateModel from "./pageTemplate.model";
import { IPageTemplate } from "./pageTemplate.interface";

export async function createPageTemplate(payload: Partial<IPageTemplate>): Promise<IPageTemplate> {
  return PageTemplateModel.create(payload);
}

export async function getAllPageTemplates(filter: Record<string, any> = {}): Promise<IPageTemplate[]> {
  return PageTemplateModel.find(filter).sort({ name: 1 }).lean() as unknown as IPageTemplate[];
}

export async function getPageTemplateById(id: string): Promise<IPageTemplate | null> {
  return PageTemplateModel.findById(id).lean();
}

export async function getPageTemplateBySlug(slug: string): Promise<IPageTemplate | null> {
  return PageTemplateModel.findOne({ slug }).lean();
}

export async function updatePageTemplate(id: string, payload: Partial<IPageTemplate>): Promise<IPageTemplate | null> {
  const page = await PageTemplateModel.findById(id);
  if (!page) return null;
  Object.assign(page, payload);
  await page.save();
  return page.toObject();
}

export async function deletePageTemplate(id: string): Promise<IPageTemplate | null> {
  return PageTemplateModel.findByIdAndDelete(id).lean();
}