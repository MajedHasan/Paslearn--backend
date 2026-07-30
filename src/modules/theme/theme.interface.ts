import { Document, Types } from "mongoose";

export interface IThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  heading: string;
  [key: string]: string;
}

export interface IThemeFonts {
  heading: string;
  body: string;
  [key: string]: string;
}

export interface IThemeGlobalStyles {
  colors: IThemeColors;
  fonts: IThemeFonts;
  borderRadius: string;
  spacing: string;
  customCSS: string;
}

export interface ITheme extends Document {
  name: string;
  slug: string;               // auto-generated if not provided
  description: string;
  thumbnail: string;           // URL after upload
  category?: Types.ObjectId;   // ref to ThemeCategory
  tags: string[];
  isActive: boolean;
  sortOrder: number;
  globalStyles: IThemeGlobalStyles;
  pages: Types.ObjectId[];     // refs to PageTemplate
  modules: Types.ObjectId[];   // refs to ModulePreset
  version: string;
  author: string;
  createdAt: Date;
  updatedAt: Date;
}