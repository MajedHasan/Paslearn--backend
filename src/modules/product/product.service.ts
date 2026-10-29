// src/modules/product/product.service.ts
import ProductModel from "./product.model";
import CourseModel from "../course/course.model";
import { IProduct, ICommissionPolicy } from "./product.interface";
import { Types } from "mongoose";

const DEFAULT_COMMISSION: ICommissionPolicy = {
  enabled: false,
  type: "one_time",
  valueType: "percent",
  value: 0,
  duration: "lifetime",
};

export const productService = {
  /**
   * Upsert a Product row from a Course document.
   * Called on course create/update/publish.
   */
  async syncFromCourse(course: any): Promise<IProduct | null> {
    if (!course || !course._id) return null;

    // Skip if course is soft-deleted → archive product
    if (course.deletedAt) {
      return this.archiveForRef("course", course._id);
    }

    const status: IProduct["status"] =
      course.status === "published" ? "published"
      : course.status === "archived" ? "archived"
      : "draft";

    const priceModel = course.priceModel || "onetime";
    const oneTimePrice =
      priceModel === "onetime" && course.oneTimePricing
        ? course.oneTimePricing.price
        : undefined;
    const currency =
      course.oneTimePricing?.currency || "USD";

    const subscriptionTiers =
      priceModel === "subscription" && Array.isArray(course.subscriptionTiers)
        ? course.subscriptionTiers
            .filter((t: any) => t.isActive)
            .map((t: any) => ({
              tierId: t.id,
              interval: t.interval,
              price: t.price,
            }))
        : [];

    const existing = await ProductModel.findOne({
      type: "course",
      refId: course._id,
    });

    const payload = {
      type: "course" as const,
      refId: course._id,
      teacherId: course.teacher,
      title: course.title,
      slug: course.slug,
      thumbnailUrl: course.thumbnailUrl, // controller may inject signed URL externally; leave raw here
      priceModel,
      currency,
      oneTimePrice,
      subscriptionTiers,
      status,
      publishedAt: status === "published" ? (course.publishedAt || new Date()) : null,
      // keep existing commission policy if any
      commissionPolicy: existing?.commissionPolicy || DEFAULT_COMMISSION,
    };

    if (existing) {
      Object.assign(existing, payload);
      await existing.save();
      return existing;
    }
    return ProductModel.create(payload);
  },

  async archiveForRef(type: IProduct["type"], refId: string | Types.ObjectId) {
    return ProductModel.findOneAndUpdate(
      { type, refId },
      { status: "archived", deletedAt: new Date() },
      { new: true }
    );
  },

  async findForRef(type: IProduct["type"], refId: string | Types.ObjectId) {
    return ProductModel.findOne({ type, refId, deletedAt: null });
  },

  async findBySlug(slug: string) {
    return ProductModel.findOne({ slug, status: "published", deletedAt: null });
  },
};