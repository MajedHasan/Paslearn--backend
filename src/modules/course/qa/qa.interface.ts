import { Document, Types } from "mongoose";

export interface IQaAnswer {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  body: string;
  isInstructorAnswer: boolean;
  helpfulCount: number;
  createdAt: Date;
}

export interface IQaThread extends Document {
  course: Types.ObjectId;
  teacher: Types.ObjectId;
  lessonId?: string;
  user: Types.ObjectId;
  title: string;
  body: string;
  isResolved: boolean;
  isPinned: boolean;
  answers: IQaAnswer[];
  createdAt: Date;
  updatedAt: Date;
}