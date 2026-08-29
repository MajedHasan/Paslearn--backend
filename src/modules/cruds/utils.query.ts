// src/utils/query.ts
import { Request } from "express";

export interface ParsedQuery {
  filter: Record<string, any>;
  page: number;
  limit: number;
  sort?: string;
  select?: string;
  populate?: string | string[];
  q?: string;
  searchFields?: string[];
  skip?: number;
  raw?: Record<string, any>;
}

const RESERVED_KEYS = new Set([
  "page",
  "limit",
  "sort",
  "select",
  "populate",
  "q",
  "searchFields",
  "filter",
]);

const OPERATORS = ["gte", "lte", "gt", "lt", "ne", "in", "nin", "exists", "regex"];

export function parseListQuery(
  req: Request,
  defaults = { page: 1, limit: 15 }
): ParsedQuery {
  const raw = { ...req.query } as Record<string, any>;

  const page = Math.max(1, parseInt(req.query.page as string) || defaults.page);
  const limit = Math.max(
    1,
    parseInt(req.query.limit as string) || defaults.limit
  );
  const skip = (page - 1) * limit;

  const sort = (req.query.sort as string) || undefined;
  const select = (req.query.select as string) || undefined;

  let populate: string | string[] | undefined;
  const rawPopulate = req.query.populate;

  if (typeof rawPopulate === "string") {
    populate = rawPopulate.includes(",")
      ? rawPopulate.split(",").map((s) => s.trim())
      : rawPopulate;
  } else if (Array.isArray(rawPopulate)) {
    populate = rawPopulate.map((p) => String(p));
  }

  const q = (req.query.q as string) || undefined;
  const searchFields =
    typeof req.query.searchFields === "string"
      ? req.query.searchFields.split(",").map((s) => s.trim())
      : undefined;

  const filter: Record<string, any> = {};

  // Explicit filter object (if provided)
  if (req.query.filter && typeof req.query.filter === "object") {
    Object.assign(filter, req.query.filter as Record<string, any>);
  }

  // Build advanced filters from query params like `price_gte=100`
  for (const key of Object.keys(req.query)) {
    if (RESERVED_KEYS.has(key)) continue;

    const value = req.query[key];
    const parts = key.split("_");
    const field = parts[0];
    const op = parts.length > 1 ? parts[1] : undefined;

    if (op && OPERATORS.includes(op)) {
      switch (op) {
        case "gte":
          filter[field] = { ...filter[field], $gte: parseValue(value) };
          break;
        case "lte":
          filter[field] = { ...filter[field], $lte: parseValue(value) };
          break;
        case "gt":
          filter[field] = { ...filter[field], $gt: parseValue(value) };
          break;
        case "lt":
          filter[field] = { ...filter[field], $lt: parseValue(value) };
          break;
        case "ne":
          filter[field] = { ...filter[field], $ne: parseValue(value) };
          break;
        case "in":
          filter[field] = {
            ...filter[field],
            $in: String(value).split(",").map(parseValue),
          };
          break;
        case "nin":
          filter[field] = {
            ...filter[field],
            $nin: String(value).split(",").map(parseValue),
          };
          break;
        case "exists":
          filter[field] = { ...filter[field], $exists: value === "true" };
          break;
        case "regex":
          filter[field] = { ...filter[field], $regex: value, $options: "i" };
          break;
      }
    } else {
      filter[field] = parseValue(value);
    }
  }

  return {
    filter,
    page,
    limit,
    sort,
    select,
    populate,
    q,
    searchFields,
    skip,
    raw,
  };
}

// Helper to parse string values to appropriate types (number, boolean, date)
function parseValue(value: any): any {
  if (typeof value !== "string") return value;

  if (!isNaN(Number(value))) return Number(value);
  if (value.toLowerCase() === "true") return true;
  if (value.toLowerCase() === "false") return false;
  const date = new Date(value);
  if (!isNaN(date.getTime()) && value.includes("-")) return date;
  return value;
}