export type LayoutBlockType =
  | "section"
  | "row"
  | "column"
  | "heading"
  | "text"
  | "divider"
  | "spacer"
  | "field"
  | "button"
  | "image";

export type LayoutButtonVariant = "primary" | "secondary" | "ghost";

export interface LayoutBlock {
  id: string;
  type: LayoutBlockType;
  props?: {
    title?: string;
    description?: string;
    className?: string;
    columns?: number;
    height?: number;
    text?: string;
    variant?: LayoutButtonVariant;
    action?: "submit" | "button";
    disabled?: boolean;
    src?: string;
    alt?: string;
  };
  content?: string;
  fieldKey?: string;
  children?: LayoutBlock[];
}