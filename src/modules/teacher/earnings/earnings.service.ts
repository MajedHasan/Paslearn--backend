import { Types } from "mongoose";
import OrderModel from "../../order/order.model";
import ProductModel from "../../product/product.model";
import CourseModel from "../../course/course.model";
import MediaModel from "../../media/media.model";
import { getStorageDriver } from "../../../storage/storage.factory";
import { AppError } from "../../../utils/appError";

export const teacherEarningsService = {
  /**
   * Full transaction-level breakdown with filters.
   */
  async transactions(
    teacherId: string,
    params: {
      from?: string;
      to?: string;
      productId?: string;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const tId = new Types.ObjectId(teacherId);
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, params.limit || 20);
    const skip = (page - 1) * limit;

    const match: any = { status: "paid", "items.teacher": tId };
    if (params.from || params.to) {
      match.paidAt = {};
      if (params.from) match.paidAt.$gte = new Date(params.from);
      if (params.to) match.paidAt.$lte = new Date(params.to);
    }

    const unwindMatch: any = { "items.teacher": tId };
    if (params.productId)
      unwindMatch["items.refId"] = new Types.ObjectId(params.productId);

    const pipeline: any[] = [
      { $match: match },
      { $unwind: "$items" },
      { $match: unwindMatch },
      {
        $lookup: {
          from: "commissions",
          localField: "items._id",
          foreignField: "orderItem",
          as: "affCommissions",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "buyer",
        },
      },
      { $unwind: { path: "$buyer", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "courses",
          localField: "items.refId",
          foreignField: "_id",
          as: "course",
        },
      },
      { $unwind: { path: "$course", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          affiliateCommission: { $sum: "$affCommissions.amount" },
        },
      },
      {
        $addFields: {
          netEarning: {
            $max: [
              0,
              {
                $subtract: [
                  "$items.finalPrice",
                  {
                    $add: ["$items.platformFee", "$affiliateCommission"],
                  },
                ],
              },
            ],
          },
        },
      },
      {
        $project: {
          _id: 0,
          orderId: "$_id",
          orderNumber: 1,
          paidAt: 1,
          productType: "$items.productType",
          productId: "$items.refId",
          productTitle: "$course.title",
          productSlug: "$course.slug",
          thumbnailMediaId: "$course.thumbnailMediaId",
          grossAmount: "$items.priceSnapshot",
          couponDiscount: "$items.discountShare",
          paidAmount: "$items.finalPrice",
          platformFee: "$items.platformFee",
          affiliateCommission: 1,
          netEarning: 1,
          buyerName: "$buyer.name",
          buyerEmail: "$buyer.email",
        },
      },
      { $sort: { paidAt: -1 } },
    ];

    const countPipeline = [...pipeline, { $count: "total" }];

    const [data, totalAgg, summaryAgg] = await Promise.all([
      OrderModel.aggregate([...pipeline, { $skip: skip }, { $limit: limit }]),
      OrderModel.aggregate(countPipeline),
      OrderModel.aggregate([
        ...pipeline,
        {
          $group: {
            _id: null,
            grossRevenue: { $sum: "$grossAmount" },
            totalCoupons: { $sum: "$couponDiscount" },
            totalPaid: { $sum: "$paidAmount" },
            totalPlatformFees: { $sum: "$platformFee" },
            totalAffiliateCommissions: { $sum: "$affiliateCommission" },
            netEarnings: { $sum: "$netEarning" },
            totalTransactions: { $sum: 1 },
          },
        },
      ]),
    ]);

    const summary = summaryAgg[0] || {
      grossRevenue: 0,
      totalCoupons: 0,
      totalPaid: 0,
      totalPlatformFees: 0,
      totalAffiliateCommissions: 0,
      netEarnings: 0,
      totalTransactions: 0,
    };

    // Sign thumbnails
    const driver = getStorageDriver();
    const enrichedData = await Promise.all(
      data.map(async (row: any) => {
        let thumb: string | null = null;
        if (row.thumbnailMediaId) {
          try {
            const media: any = await MediaModel.findById(
              row.thumbnailMediaId
            );
            if (media?.key) {
              if (media.visibility === "public" && media.url) {
                thumb = media.url;
              } else {
                thumb = await driver.getSignedUrl(media.key, 3600);
              }
            }
          } catch {}
        }
        return { ...row, thumbnailUrl: thumb, thumbnailMediaId: undefined };
      })
    );

    const total = totalAgg[0]?.total || 0;
    return {
      data: enrichedData,
      summary,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  /**
   * Per-product aggregate.
   */
  async perProduct(
    teacherId: string,
    params: { from?: string; to?: string } = {}
  ) {
    const tId = new Types.ObjectId(teacherId);
    const match: any = { status: "paid", "items.teacher": tId };
    if (params.from || params.to) {
      match.paidAt = {};
      if (params.from) match.paidAt.$gte = new Date(params.from);
      if (params.to) match.paidAt.$lte = new Date(params.to);
    }

    const pipeline: any[] = [
      { $match: match },
      { $unwind: "$items" },
      { $match: { "items.teacher": tId } },
      {
        $lookup: {
          from: "commissions",
          localField: "items._id",
          foreignField: "orderItem",
          as: "affCommissions",
        },
      },
      {
        $addFields: {
          affiliateCommission: { $sum: "$affCommissions.amount" },
        },
      },
      {
        $group: {
          _id: "$items.refId",
          productType: { $first: "$items.productType" },
          grossRevenue: { $sum: "$items.priceSnapshot" },
          totalCoupons: { $sum: "$items.discountShare" },
          totalPaid: { $sum: "$items.finalPrice" },
          totalPlatformFees: { $sum: "$items.platformFee" },
          totalAffiliateCommissions: { $sum: "$affiliateCommission" },
          sales: { $sum: 1 },
        },
      },
      {
        $addFields: {
          netEarnings: {
            $max: [
              0,
              {
                $subtract: [
                  "$totalPaid",
                  {
                    $add: [
                      "$totalPlatformFees",
                      "$totalAffiliateCommissions",
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
      { $sort: { netEarnings: -1 } },
      {
        $lookup: {
          from: "courses",
          localField: "_id",
          foreignField: "_id",
          as: "course",
        },
      },
      { $unwind: { path: "$course", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          productId: "$_id",
          productType: 1,
          title: "$course.title",
          slug: "$course.slug",
          thumbnailMediaId: "$course.thumbnailMediaId",
          ratingAvg: "$course.ratingAvg",
          enrollmentCount: "$course.enrollmentCount",
          grossRevenue: 1,
          totalCoupons: 1,
          totalPaid: 1,
          totalPlatformFees: 1,
          totalAffiliateCommissions: 1,
          netEarnings: 1,
          sales: 1,
        },
      },
    ];

    const data = await OrderModel.aggregate(pipeline);

    const driver = getStorageDriver();
    return Promise.all(
      data.map(async (row: any) => {
        let thumb: string | null = null;
        if (row.thumbnailMediaId) {
          try {
            const media: any = await MediaModel.findById(
              row.thumbnailMediaId
            );
            if (media?.key) {
              if (media.visibility === "public" && media.url) {
                thumb = media.url;
              } else {
                thumb = await driver.getSignedUrl(media.key, 3600);
              }
            }
          } catch {}
        }
        return { ...row, thumbnailUrl: thumb, thumbnailMediaId: undefined };
      })
    );
  },

  /**
   * Commission settings for all teacher's products.
   */
  async listProductsWithCommission(teacherId: string) {
    const products = await ProductModel.find({
      teacherId,
      type: "course",
      deletedAt: null,
    })
      .populate("refId", "title slug thumbnailMediaId ratingAvg enrollmentCount status")
      .sort({ createdAt: -1 })
      .lean();

    const driver = getStorageDriver();
    return Promise.all(
      products.map(async (p: any) => {
        const course = p.refId;
        let thumb: string | null = null;
        if (course?.thumbnailMediaId) {
          try {
            const media: any = await MediaModel.findById(
              course.thumbnailMediaId
            );
            if (media?.key) {
              thumb =
                media.visibility === "public" && media.url
                  ? media.url
                  : await driver.getSignedUrl(media.key, 3600);
            }
          } catch {}
        }

        return {
          productId: String((p as any)._id),
          courseId: String(course?._id || p.refId),
          title: course?.title || p.title || "Untitled",
          slug: course?.slug || p.slug,
          thumbnailUrl: thumb,
          status: course?.status || p.status,
          ratingAvg: course?.ratingAvg || 0,
          enrollmentCount: course?.enrollmentCount || 0,
          priceModel: p.priceModel,
          oneTimePrice: p.oneTimePrice,
          commissionPolicy: p.commissionPolicy || {
            enabled: false,
            type: "one_time",
            valueType: "percent",
            value: 0,
            duration: "lifetime",
          },
        };
      })
    );
  },

  /**
   * Update commission for a product. Only teachers who own it can update.
   */
  async updateCommission(
    teacherId: string,
    productId: string,
    payload: {
      enabled: boolean;
      type: "one_time" | "recurring";
      valueType: "percent" | "flat";
      value: number;
      duration: "lifetime" | "fixed_months";
      durationMonths?: number;
    }
  ) {
    if (payload.value < 0) {
      throw new AppError("Commission value cannot be negative", 400);
    }
    if (payload.valueType === "percent") {
      if (payload.value > 50) {
        throw new AppError(
          "Commission percentage cannot exceed 50% (you need to keep your earnings)",
          400
        );
      }
    }
    if (
      payload.duration === "fixed_months" &&
      (!payload.durationMonths || payload.durationMonths < 1)
    ) {
      throw new AppError(
        "durationMonths is required when duration is fixed_months",
        400
      );
    }

    const product = await ProductModel.findOne({
      _id: productId,
      teacherId,
      deletedAt: null,
    });
    if (!product) throw new AppError("Product not found or not yours", 404);

    product.commissionPolicy = {
      enabled: payload.enabled,
      type: payload.type,
      valueType: payload.valueType,
      value: payload.value,
      duration: payload.duration,
      ...(payload.duration === "fixed_months" && {
        durationMonths: payload.durationMonths,
      }),
    };

    await product.save();
    return product.toObject();
  },
};