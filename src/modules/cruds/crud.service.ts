// src/services/crud.service.ts
import { Model, ClientSession, FilterQuery, PipelineStage, Types } from "mongoose";

export type SortDirection = "asc" | "desc";

export interface CrudServiceOptions {
  defaultPopulate?: string | object | (string | object)[];
  defaultSort?: string;
  searchFields?: string[];      // fields to run `q` search on
  softDeleteField?: string;     // e.g. "deletedAt" or "isDeleted"
  allowedFilterFields?: string[]; // optional allowlist for filters
  allowedPopulate?: string[];   // optional allowlist for populate paths
  defaultLimit?: number;
  lean?: boolean;
  // hooks
  beforeCreate?: (payload: any, context?: any) => Promise<any> | any;
  afterCreate?: (doc: any, context?: any) => Promise<any> | any;
  beforeUpdate?: (id: string, payload: any, context?: any) => Promise<any> | any;
  afterUpdate?: (doc: any, context?: any) => Promise<any> | any;
  beforeDelete?: (id: string, session?: ClientSession) => Promise<any>;
  afterDelete?: (doc: any, session?: ClientSession) => Promise<any>;
  beforeRestore?: (id: string, session?: ClientSession) => Promise<any>;
  afterRestore?: (doc: any, session?: ClientSession) => Promise<any>;
}

export function createCrudService(
  model: Model<any>,
  opts: CrudServiceOptions = {}
) {
  const {
    defaultPopulate,
    defaultSort = "-createdAt",
    searchFields = [],
    softDeleteField,
    allowedFilterFields,
    allowedPopulate,
    defaultLimit = 15,
    lean = true,
    beforeCreate,
    afterCreate,
    beforeUpdate,
    afterUpdate,
  } = opts;

  async function buildQuery(
    filter: FilterQuery<any>,
    q?: string,
    searchF?: string[]
  ) {
    const query: any = { ...filter };

    if (softDeleteField && query[softDeleteField] === undefined) {
      query[softDeleteField] = { $exists: false };
    }

    if (q) {
      const fields = searchF && searchF.length ? searchF : searchFields;
      if (fields.length) {
        query.$or = fields.map((f) => ({ [f]: new RegExp(escapeRegex(q), "i") }));
      }
    }

    return query;
  }

  // Validate populate paths
  function validatePopulate(populate?: any) {
    if (allowedPopulate && populate) {
      const paths = Array.isArray(populate) ? populate : [populate];
      paths.forEach((p) => {
        const pathStr = typeof p === "string" ? p : p.path;
        if (!allowedPopulate.includes(pathStr)) {
          throw new Error(`Populate path "${pathStr}" is not allowed`);
        }
      });
    }
  }

  // Validate filter keys
  function sanitizeFilter(filter: Record<string, any>) {
    if (allowedFilterFields && allowedFilterFields.length) {
      const sanitized: Record<string, any> = {};
      for (const key of Object.keys(filter)) {
        if (allowedFilterFields.includes(key) || key === "$or" || key === "$and") {
          sanitized[key] = filter[key];
        }
      }
      return sanitized;
    }
    return filter;
  }

  return {
    // list with pagination, filtering, sorting, select, populate
    async list({
      filter = {},
      page = 1,
      limit = defaultLimit,
      sort = defaultSort,
      select,
      populate,
      q,
      searchFields: sf,
    }: any = {}) {
      validatePopulate(populate);
      const sanitizedFilter = sanitizeFilter(filter);
      const skip = (page - 1) * limit;
      const queryObj = await buildQuery(sanitizedFilter, q, sf);

      // Parse sort string into object
      let sortObj: any = {};
      if (sort) {
        const sorts = sort.split(",");
        sorts.forEach((s: string) => {
          const trimmed = s.trim();
          if (trimmed.startsWith("-")) {
            sortObj[trimmed.slice(1)] = -1;
          } else {
            sortObj[trimmed] = 1;
          }
        });
      } else {
        // defaultSort may be "-createdAt"
        const ds = defaultSort.split(",");
        ds.forEach((s: string) => {
          const trimmed = s.trim();
          if (trimmed.startsWith("-")) {
            sortObj[trimmed.slice(1)] = -1;
          } else {
            sortObj[trimmed] = 1;
          }
        });
      }

      const [data, total] = await Promise.all([
        model
          .find(queryObj)
          .sort(sortObj)
          .skip(skip)
          .limit(limit)
          .select(select || "")
          .populate(populate || defaultPopulate)
          .lean(lean),
        model.countDocuments(queryObj),
      ]);

      const totalPages = Math.ceil(total / limit);
      return {
        data,
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      };
    },

    async getById(
      id: string,
      { populate, select }: { populate?: any; select?: string } = {}
    ) {
      validatePopulate(populate);
      let q = model.findById(id).select(select || "");
      if (populate || defaultPopulate)
        q = q.populate(populate ?? defaultPopulate);
      if (lean) q = q.lean();
      return q.exec();
    },

    async create(
      payload: any,
      { session, userId }: { session?: ClientSession; userId?: string } = {}
    ) {
      if (beforeCreate) payload = await beforeCreate(payload, { userId });
      const doc = new model(payload);
      await doc.save({ session });
      let result = doc;
      if (afterCreate) result = await afterCreate(result, { userId });
      if (lean && result?.toObject) result = result.toObject();
      return result;
    },

    async update(
      id: string,
      payload: any,
      { session, populate, userId }: { session?: ClientSession; populate?: any; userId?: string } = {}
    ) {
      if (beforeUpdate) payload = await beforeUpdate(id, payload, { userId });
      const updated = await model
        .findByIdAndUpdate(id, payload, { new: true, session })
        .populate(populate || defaultPopulate);
      if (afterUpdate) await afterUpdate(updated, { userId });
      if (lean && updated?.toObject) return updated.toObject();
      return updated;
    },

    async upsert(
      filter: FilterQuery<any>,
      payload: any,
      { session, userId }: { session?: ClientSession; userId?: string } = {}
    ) {
      if (beforeCreate) payload = await beforeCreate(payload, { userId });
      const doc = await model.findOneAndUpdate(filter, payload, {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        session,
      });
      if (lean && doc?.toObject) return doc.toObject();
      return doc;
    },

    async remove(
      id: string,
      {
        hard = false,
        session,
        userId,
      }: { hard?: boolean; session?: ClientSession; userId?: string } = {}
    ) {
      if (opts.beforeDelete) await opts.beforeDelete(id, session);

      let deleted;

      if (softDeleteField && !hard) {
        deleted = await model.findByIdAndUpdate(
          id,
          { [softDeleteField]: new Date() },
          { new: true, session }
        );
      } else {
        deleted = await model.findByIdAndDelete(id, { session });
      }

      if (opts.afterDelete) await opts.afterDelete(deleted, session);

      return deleted;
    },

    async restore(
      id: string,
      { session, userId }: { session?: ClientSession; userId?: string } = {}
    ) {
      if (!softDeleteField) throw new Error("softDeleteField not configured");
      if (opts.beforeRestore) await opts.beforeRestore(id, session);
      const restored = await model.findByIdAndUpdate(
        id,
        { $unset: { [softDeleteField]: "" } },
        { new: true, session }
      );
      if (opts.afterRestore) await opts.afterRestore(restored, session);
      return restored;
    },

    // bulk ops
    async bulkCreate(
      items: any[],
      { session, userId }: { session?: ClientSession; userId?: string } = {}
    ) {
      if (beforeCreate) {
        items = await Promise.all(items.map((item) => beforeCreate(item, { userId })));
      }
      const created = await model.insertMany(items, { session });
      if (afterCreate) {
        await Promise.all(created.map((doc) => afterCreate(doc, { userId })));
      }
      return created;
    },

    async bulkUpdate(
      conditionsAndUpdates: { filter: any; update: any }[],
      { session, userId }: { session?: ClientSession; userId?: string } = {}
    ) {
      const results = [];
      for (const item of conditionsAndUpdates) {
        if (beforeUpdate) {
          item.update = await beforeUpdate("", item.update, { userId });
        }
        const r = await model.updateMany(item.filter, item.update, { session });
        results.push(r);
      }
      return results;
    },

    async bulkDelete(
      filters: FilterQuery<any>[],
      {
        hard = false,
        session,
        userId,
      }: { hard?: boolean; session?: ClientSession; userId?: string } = {}
    ) {
      if (softDeleteField && !hard) {
        const ops = [];
        for (const f of filters) {
          if (opts.beforeDelete) await opts.beforeDelete("", session);
          ops.push(
            model.updateMany(f, { [softDeleteField]: new Date() }, { session })
          );
        }
        return Promise.all(ops);
      } else {
        const ops = [];
        for (const f of filters) {
          if (opts.beforeDelete) await opts.beforeDelete("", session);
          ops.push(model.deleteMany(f, { session }));
        }
        return Promise.all(ops);
      }
    },

    // aggregation wrapper
    async aggregate(
      pipeline: PipelineStage[],
      { page, limit }: { page?: number; limit?: number } = {}
    ) {
      if (page && limit) {
        const skip = (page - 1) * limit;

        const facetStage: PipelineStage = {
          $facet: {
            data: [...pipeline, { $skip: skip }, { $limit: limit }],
            total: [{ $count: "count" }],
          },
        } as PipelineStage;

        const res = await model.aggregate([facetStage]).exec();
        const data = res[0]?.data ?? [];
        const total = res[0]?.total?.[0]?.count ?? 0;
        return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
      }

      const data = await model.aggregate(pipeline).exec();
      return { data, total: data.length };
    },

    // transaction helper
    async withTransaction(fn: (session: ClientSession) => Promise<any>) {
      const session = await model.startSession();
      try {
        let res;
        await session.withTransaction(async () => {
          res = await fn(session);
        });
        return res;
      } finally {
        session.endSession();
      }
    },

    // export data as CSV string
    async exportCSV({
      filter = {},
      fields = [],
      populate,
    }: { filter?: any; fields?: string[]; populate?: any } = {}) {
      validatePopulate(populate);
      const docs = await model
        .find(filter)
        .select(fields.join(" "))
        .populate(populate || defaultPopulate)
        .lean();
      if (!docs || !docs.length) return "";
      const header = fields.join(",");
      const rows = docs.map((d: any) =>
        fields
          .map((f) => {
            const val = f.split(".").reduce((acc, k) => (acc ? acc[k] : ""), d);
            return `"${String(val ?? "").replace(/"/g, '""')}"`;
          })
          .join(",")
      );
      return [header, ...rows].join("\n");
    },

    // find one
    async findOne(
      filter: any,
      { populate, select }: { populate?: any; select?: string } = {}
    ) {
      validatePopulate(populate);
      let q = model.findOne(filter).select(select || "");
      if (populate || defaultPopulate)
        q = q.populate(populate ?? defaultPopulate);
      if (lean) q = q.lean();
      return q.exec();
    },

    model,
  };
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}