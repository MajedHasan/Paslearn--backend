// controllers/profile.controller.ts
import { Request, Response, NextFunction } from "express";
import multer from "multer";
import * as ProfileService from "../../services/student/studentProfile.service";
import { Readable } from "stream";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
}); // 5MB

// GET /api/profile
export async function getProfile(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = (req as any).user?.sub;
    const profile = await ProfileService.getStudentProfileByUserId(userId);
    res.json({ ok: true, profile });
  } catch (err) {
    next(err);
  }
}

// POST /api/profile  (multipart/form-data)
export const postProfile = [
  upload.single("profilePicture"),
  async function (req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.sub;
      const body = req.body;
      const file = req.file;
      let buffer: Buffer | undefined;
      if (file) buffer = file.buffer;
      const profile = await ProfileService.upsertStudentProfile({
        userId,
        payload: {
          fullName: body.fullName,
          email: body.email,
          username: body.username,
          phoneNumber: body.phoneNumber,
          bio: body.bio,
        },
        profilePictureBuffer: buffer,
        profilePictureFilename: file?.originalname,
      });
      res.json({ ok: true, profile });
    } catch (err) {
      next(err);
    }
  },
];

// POST /api/profile/change-password
export async function postChangePassword(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = (req as any).user?.sub;
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) throw new Error("Missing fields");
    await ProfileService.changePassword(userId, currentPassword, newPassword);
    res.json({ ok: true, message: "Password changed" });
  } catch (err) {
    next(err);
  }
}

// 2FA prepare -> GET otpauth + base32
export async function prepare2FA(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = (req as any).user?.sub;
    const data = await ProfileService.prepare2FA(userId);
    res.json({ ok: true, ...data });
  } catch (err) {
    next(err);
  }
}

// verify + enable 2FA
export async function enable2FA(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = (req as any).user?.sub;
    const { token } = req.body;
    if (!token) throw new Error("Missing token");
    const recoveryCodes = await ProfileService.enable2FA(userId, token);
    res.json({ ok: true, recoveryCodes });
  } catch (err) {
    next(err);
  }
}

// disable 2FA
export async function disable2FA(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = (req as any).user?.sub;
    const { tokenOrRecovery } = req.body;
    await ProfileService.disable2FA(userId, tokenOrRecovery);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// sessions
export async function listSessions(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = (req as any).user?.sub;
    const sessions = await ProfileService.listSessions(userId);
    res.json({ ok: true, sessions });
  } catch (err) {
    next(err);
  }
}

export async function revokeSession(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = (req as any).user?.sub;
    const { jti } = req.body;
    if (!jti) throw new Error("Missing jti");
    await ProfileService.revokeSession(userId, jti);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function revokeAllSessions(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = (req as any).user?.sub;
    const { exceptJti } = req.body;
    await ProfileService.revokeAllSessions(userId, exceptJti);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// connected accounts
export async function listConnectedAccounts(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = (req as any).user?.sub;
    const list = await ProfileService.listConnectedAccounts(userId);
    res.json({ ok: true, connected: list });
  } catch (err) {
    next(err);
  }
}

export async function disconnectProvider(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = (req as any).user?.sub;
    const { provider } = req.body;
    if (!provider) throw new Error("Missing provider");
    await ProfileService.disconnectProvider(userId, provider);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// delete account
export async function deleteAccount(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = (req as any).user?.sub;
    await ProfileService.deleteAccount(userId);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
