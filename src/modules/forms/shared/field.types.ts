export type FieldType =
  | "text"
  | "email"
  | "tel"
  | "textarea"
  | "select"
  | "radio"
  | "checkbox"
  | "number"
  | "date"
  | "time"
  | "url"
  | "password"
  | "hidden"
  | "multiselect"
  | "file"
  | "rating"
  | "date_range";

export type FieldWidth = "full" | "half" | "third" | "quarter";

export interface FieldOption {
  label: string;
  value: string;
}

export interface FieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  patternMessage?: string;
  allowedTypes?: string[];
  maxFileSize?: number;
  maxFiles?: number;
}

export interface FieldDefinition {
  key: string;
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  helpText?: string;
  defaultValue?: any;
  options?: FieldOption[];
  validation?: FieldValidation;
  hidden?: boolean;
  width?: FieldWidth;
}