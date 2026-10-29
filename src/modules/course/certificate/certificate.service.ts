import crypto from "crypto";
import CertificateModel from "./certificate.model";
import CourseModel from "../course.model";
import EnrollmentModel from "../enrollment/enrollment.model";
import UserModel from "../../../models/user.model"; // adjust path per your project
import { AppError } from "../../../utils/appError";

function genCertNumber(): string {
  return "PLS-CERT-" + crypto.randomBytes(5).toString("hex").toUpperCase();
}

export const certificateService = {
  /**
   * Issue a certificate if the student qualifies.
   * Auto-issued by event hooks (enrollment complete, exam passed).
   */
  async issueIfEligible(userId: string, courseId: string) {
    const course = await CourseModel.findById(courseId).lean();
    if (!course || !(course as any).certificateEnabled) return null;

    const enrollment = await EnrollmentModel.findOne({ user: userId, course: courseId, status: "active" });
    if (!enrollment) throw new AppError("Not enrolled", 403);

    // Completion gating
    const criteria = (course as any).completionCriteria;
    if (criteria === "manual") {
      throw new AppError("Certificate must be issued manually by teacher", 400);
    }
    if (criteria === "watch_all" && enrollment.progressPercent < 100) {
      throw new AppError("Course not completed", 400);
    }
    // "pass_quiz" / "pass_exam" gating — checked by caller which knows the quiz

    const existing = await CertificateModel.findOne({ user: userId, course: courseId });
    if (existing) return existing;

    const cert = await CertificateModel.create({
      user: userId,
      course: courseId,
      teacher: (course as any).teacher,
      certificateNumber: genCertNumber(),
      verificationSlug: crypto.randomBytes(8).toString("hex"),
      meta: {
        studentName: (await UserModel.findById(userId).select("name").lean())?.name,
        courseTitle: (course as any).title,
      },
    });
    return cert;
  },

  async manualIssue(teacherId: string, courseId: string, userId: string) {
    const course = await CourseModel.findOne({ _id: courseId, teacher: teacherId });
    if (!course) throw new AppError("Course not found or not yours", 404);
    const existing = await CertificateModel.findOne({ user: userId, course: courseId });
    if (existing) return existing;
    const cert = await CertificateModel.create({
      user: userId,
      course: courseId,
      teacher: teacherId,
      certificateNumber: genCertNumber(),
      verificationSlug: crypto.randomBytes(8).toString("hex"),
      meta: { manuallyIssued: true },
    });
    return cert;
  },

  async listMine(userId: string) {
    return CertificateModel.find({ user: userId, revokedAt: null })
      .populate("course", "title slug thumbnailMediaId")
      .sort({ issuedAt: -1 })
      .lean();
  },

  async verify(slug: string) {
    const cert: any = await CertificateModel.findOne({ verificationSlug: slug })
      .populate("user", "name")
      .populate("course", "title slug")
      .populate("teacher", "name")
      .lean();
    if (!cert) throw new AppError("Certificate not found", 404);
    return {
      certificateNumber: cert.certificateNumber,
      issuedAt: cert.issuedAt,
      revoked: !!cert.revokedAt,
      revokeReason: cert.revokeReason,
      studentName: cert.user?.name,
      courseTitle: cert.course?.title,
      courseSlug: cert.course?.slug,
      teacherName: cert.teacher?.name,
    };
  },

  async revoke(teacherId: string, certId: string, reason?: string) {
    const cert = await CertificateModel.findOneAndUpdate(
      { _id: certId, teacher: teacherId },
      { revokedAt: new Date(), revokeReason: reason },
      { new: true }
    );
    if (!cert) throw new AppError("Certificate not found or not yours", 404);
    return cert;
  },
};