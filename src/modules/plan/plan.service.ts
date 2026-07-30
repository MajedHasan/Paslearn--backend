import PlanModel from "./plan.model";
import { IPlan, IPlanLimits } from "./plan.interface";

function normalizeLimits(limits?: Partial<IPlanLimits>): IPlanLimits {
  return {
    maxCourses: limits?.maxCourses ?? 0,
    maxStudents: limits?.maxStudents ?? 0,
    maxTemplates: limits?.maxTemplates ?? 0,
    maxLandingPages: limits?.maxLandingPages ?? 0,
    maxForms: limits?.maxForms ?? 0,
    maxAutomations: limits?.maxAutomations ?? 0,
    maxSalesPages: limits?.maxSalesPages ?? 0,
    maxFunnels: limits?.maxFunnels ?? 0,
    maxEmailCampaigns: limits?.maxEmailCampaigns ?? 0,
    maxDigitalProducts: limits?.maxDigitalProducts ?? 0,
    maxCoachingClients: limits?.maxCoachingClients ?? 0,
    maxCourseEnrollments: limits?.maxCourseEnrollments ?? 0,
    certificateEnabled: limits?.certificateEnabled ?? false,
    jobBoardAccess: limits?.jobBoardAccess ?? false,
    aiCredits: limits?.aiCredits ?? 0,
  };
}

export async function createPlan(payload: Partial<IPlan>): Promise<IPlan> {
  const existing = await PlanModel.findOne({ slug: payload.slug });
  if (existing) throw new Error(`Plan with slug "${payload.slug}" already exists`);

  const plan = await PlanModel.create({
    ...payload,
    limits: normalizeLimits(payload.limits),
  });
  return plan;
}

export async function getAllPlans(filter: Record<string, any> = {}): Promise<IPlan[]> {
  return PlanModel.find(filter)
    .sort({ sortOrder: 1, createdAt: -1 })
    .lean() as unknown as IPlan[];
}

export async function getActivePlans(role?: string): Promise<IPlan[]> {
  const query: any = { isActive: true };
  if (role) {
    query.applicableTo = { $in: ["all", role] };
  }
  return PlanModel.find(query)
    .sort({ sortOrder: 1 })
    .lean() as unknown as IPlan[];
}

export async function getPlanById(id: string): Promise<IPlan | null> {
  return PlanModel.findById(id).lean();
}

export async function getPlanBySlug(slug: string): Promise<IPlan | null> {
  return PlanModel.findOne({ slug }).lean();
}

export async function updatePlan(id: string, payload: Partial<IPlan>): Promise<IPlan | null> {
  const plan = await PlanModel.findById(id);
  if (!plan) return null;

  if (payload.slug && payload.slug !== plan.slug) {
    const existing = await PlanModel.findOne({ slug: payload.slug, _id: { $ne: id } });
    if (existing) throw new Error(`Plan with slug "${payload.slug}" already exists`);
  }

  if (payload.limits) {
    payload.limits = normalizeLimits(payload.limits) as any;
  }

  Object.assign(plan, payload);
  await plan.save();
  return plan.toObject();
}

export async function deletePlan(id: string): Promise<IPlan | null> {
  return PlanModel.findByIdAndDelete(id).lean();
}

export async function togglePlanActive(id: string): Promise<IPlan | null> {
  const plan = await PlanModel.findById(id);
  if (!plan) throw new Error("Plan not found");
  plan.isActive = !plan.isActive;
  await plan.save();
  return plan.toObject();
}