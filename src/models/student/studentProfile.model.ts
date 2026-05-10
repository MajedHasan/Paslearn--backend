// models/studentProfile.model.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStudentProfile extends Document {
  user: mongoose.Types.ObjectId;
  fullName?: string;
  username?: string;
  phoneNumber?: string;
  bio?: string;
  profileImageUrl?: string;
  enrollmentNumber?: string;
  gradeLevel?: string;
  coursesEnrolled?: mongoose.Types.ObjectId[]; // refs to Course
  twoFactor?: {
    enabled: boolean;
    // store base32 secret encrypted in prod. For example purposes stored as string.
    secret?: string;
    // recovery codes hashed in storage (store plain only in generation moment)
    recoveryCodes?: string[];
  };
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const StudentProfileSchema = new Schema<IStudentProfile>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    fullName: { type: String, trim: true },
    username: { type: String, trim: true, index: true, sparse: true },
    phoneNumber: { type: String, trim: true },
    bio: { type: String },
    profileImageUrl: { type: String },
    enrollmentNumber: { type: String, index: true, sparse: true },
    gradeLevel: { type: String },
    coursesEnrolled: [{ type: Schema.Types.ObjectId, ref: "Course" }],
    twoFactor: {
      enabled: { type: Boolean, default: false },
      secret: { type: String }, // ENCRYPT in prod
      recoveryCodes: [{ type: String }], // store hashed in prod
    },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// remove sensitive fields when returning to client
StudentProfileSchema.methods.toJSON = function () {
  const obj = this.toObject();
  if (obj.twoFactor) {
    delete obj.twoFactor.secret;
    delete obj.twoFactor.recoveryCodes;
  }
  return obj;
};

const StudentProfileModel: Model<IStudentProfile> =
  mongoose.models.StudentProfile ||
  mongoose.model<IStudentProfile>("StudentProfile", StudentProfileSchema);

export default StudentProfileModel;
