import { Request, Response, NextFunction } from "express";
import {
  createTeacherApplication,
  getTeacherProfile,
  updateTeacherProfile,
} from "./teacherProfile.service";

export async function createTeacherApplicationController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Auth middleware sets req.user (decoded JWT). Get user id from it.
    const user = (req as any).user;
      
    console.log("User ID from JWT:", user); // Debugging line
      
      if (!user || !user.sub) {
        console.log("User information is missing in the request:", user.sub); // Debugging line
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
      const userId = user.sub; // Use _id if available, otherwise fallback to sub
      

    const body = req.body;

    // Parse JSON fields safely
    const academicCareer = body.academicCareer ? JSON.parse(body.academicCareer) : undefined;
    const certificates = body.certificates ? JSON.parse(body.certificates) : undefined;
    const customFields = body.customFields ? JSON.parse(body.customFields) : undefined;

    // Extract file paths (multer stores files in req.files)
    const files = (req as any).files || {};
    const photoFile = files.photo?.[0];
    const recommendationFile = files.recommendationImage?.[0];

    const payload = {
      user: userId,
      domain: body.domain,
      academicCareer,
      certificates,
      reference: body.reference,
      recommendation: body.recommendation,
      recommendationImage: recommendationFile
        ? "/uploads/teachers/" + recommendationFile.filename
        : undefined,
      customFields,
      selectedPlan: body.selectedPlan || undefined,
      selectedTemplate: body.selectedTemplate || undefined,
      photo: photoFile ? "/uploads/teachers/" + photoFile.filename : undefined,
    };

    const teacherProfile = await createTeacherApplication(payload);

    return res.status(201).json({
      success: true,
      message: "Application submitted successfully",
      data: teacherProfile,
    });
  } catch (error) {
    next(error);
  }
}

export async function getTeacherProfileController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // const userId = (req as any).user._id;
    const userId = (req as any).user.sub; // Use sub from JWT payload
    const profile = await getTeacherProfile(userId);
    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }
    return res.status(200).json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
}

export async function updateTeacherProfileController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // const userId = (req as any).user._id;
    const userId = (req as any).user.sub; // Use sub from JWT payload
    const updates = req.body;
    const profile = await updateTeacherProfile(userId, updates);
    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }
    return res.status(200).json({
      success: true,
      message: "Profile updated",
      data: profile,
    });
  } catch (error) {
    next(error);
  }
}