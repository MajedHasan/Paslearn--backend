import { Document, Types } from "mongoose";

export type ReviewStatus = "visible" | "hidden" | "flagged" | "pending";

export interface IReview extends Document {
  user: Types.ObjectId;
  course: Types.ObjectId;
  teacher: Types.ObjectId;
  enrollment: Types.ObjectId;
  orderItemId?: Types.ObjectId;
  rating: 1 | 2 | 3 | 4 | 5;
  title?: string;
  comment?: string;
  isVerifiedPurchase: boolean;
  status: ReviewStatus;
  teacherReply?: {
    text: string;
    repliedAt: Date;
    repliedBy: Types.ObjectId;
  };
  helpfulCount: number;
  flaggedBy?: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}