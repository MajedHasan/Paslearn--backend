import TeacherProfileModel from "./teacherProfile.model";
import PlanModel from "../../plan/plan.model";
import { createSubscription } from "../../subscription/subscription.service";
import { ITeacherProfile } from "./teacherProfile.interface";
import mongoose from "mongoose";

interface ApplicationPayload {
  user: string;                     // req.user._id
  domain?: string;
  academicCareer?: any;
  certificates?: any;
  reference?: string;
  recommendation?: string;
  recommendationImage?: string;
  customFields?: any;
  selectedPlan?: string;            // plan id
  selectedTemplate?: string;        // theme id
  photo?: string;                   // file path
}

export async function createTeacherApplication(
  payload: ApplicationPayload
): Promise<ITeacherProfile> {
  // Check if teacher profile already exists
  const existing = await TeacherProfileModel.findOne({ user: payload.user });
  if (existing) {
    throw new Error("Teacher profile already exists for this user");
  }

  // Determine if plan is free or paid
  let status: ITeacherProfile["status"] = "active";
  let subscriptionBillingCycle: "monthly" | "yearly" | "lifetime" = "monthly";

  if (payload.selectedPlan) {
    const plan = await PlanModel.findById(payload.selectedPlan);
    if (!plan) throw new Error("Selected plan not found");

    subscriptionBillingCycle = plan.price.billingCycle;

    if (plan.price.amount > 0) {
      // Paid plan: require payment before activation
      status = "pending_payment";
    }
  }

  // Create the teacher profile
  const teacherProfile = await TeacherProfileModel.create({
    user: payload.user,
    domain: payload.domain,
    academicCareer: payload.academicCareer,
    certificates: payload.certificates,
    reference: payload.reference,
    recommendation: payload.recommendation,
    recommendationImage: payload.recommendationImage,
    customFields: payload.customFields,
    selectedPlan: payload.selectedPlan,
    selectedTemplate: payload.selectedTemplate,
    photo: payload.photo,
    status,
  });

  // Create subscription record if a plan was chosen
  if (payload.selectedPlan) {
    await createSubscription(
      payload.user,
      payload.selectedPlan,
      subscriptionBillingCycle,
      new Date(),
      undefined,                      // endDate (null for lifetime or ongoing)
    );
  }

  return teacherProfile;
}

export async function getTeacherProfile(userId: string) {
  return TeacherProfileModel.findOne({ user: userId })
    .populate("selectedPlan")
    .populate("selectedTemplate")
    .lean();
}

export async function updateTeacherProfile(
  userId: string,
  data: Partial<ITeacherProfile>
) {
  return TeacherProfileModel.findOneAndUpdate({ user: userId }, data, {
    new: true,
  }).lean();
}