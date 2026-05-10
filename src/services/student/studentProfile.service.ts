// services/profile.service.ts
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import crypto from "crypto";

import StudentProfileModel, {
  IStudentProfile,
} from "../../models/student/studentProfile.model";
import UserModel from "../../models/user.model";
import SessionModel from "../../models/session.model";
import ConnectedAccountModel from "../../models/connectedAccount.model";
import { StorageDriver } from "../../utils/storage";
import { generateTOTPSecret } from "../../utils/totp";

export async function getStudentProfileByUserId(userId: string) {
  const profile = await StudentProfileModel.findOne({
    user: userId,
    deletedAt: null,
  }).lean();
  return profile;
}

/**
 * Update profile (supports form-data with optional profilePicture buffer)
 * - updates both User (email) and StudentProfile (fullName, username, phoneNumber, bio, profileImageUrl)
 * - uses transaction to keep consistency
 */
export async function upsertStudentProfile({
  userId,
  payload,
  profilePictureBuffer,
  profilePictureFilename,
}: {
  userId: string;
  payload: {
    fullName?: string;
    email?: string;
    username?: string;
    phoneNumber?: string;
    bio?: string;
  };
  profilePictureBuffer?: Buffer | null;
  profilePictureFilename?: string | null;
}) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // if email changed - ensure uniqueness and mark emailVerified = false (you may want to trigger a verify flow)
    if (payload.email) {
      const existing = await UserModel.findOne({
        email: payload.email.toLowerCase(),
        _id: { $ne: userId },
      }).session(session);
      if (existing) throw new Error("Email already in use");
      await UserModel.findByIdAndUpdate(
        userId,
        { email: payload.email.toLowerCase(), emailVerified: false },
        { session }
      );
    }

    // upload profile picture if provided
    let uploadedUrl: string | undefined;
    if (profilePictureBuffer && profilePictureFilename) {
      // in prod call S3 upload; here using local
      const uploaded = await StorageDriver.uploadLocal(
        profilePictureBuffer,
        profilePictureFilename,
        "uploads"
      );
      uploadedUrl = uploaded.url;
    }

    // upsert student profile
    const update: Partial<IStudentProfile> = {
      fullName: payload.fullName,
      username: payload.username,
      phoneNumber: payload.phoneNumber,
      bio: payload.bio,
    } as any;
    if (uploadedUrl) update.profileImageUrl = uploadedUrl;

    const profile = await StudentProfileModel.findOneAndUpdate(
      { user: userId },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true, session }
    );

    await session.commitTransaction();
    session.endSession();

    return profile;
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

/**
 * Change password - verify current password and replace with new hashed password.
 */
export async function changePassword(
  userId: string,
  currentPlain: string,
  newPlain: string
) {
  const user = await UserModel.findById(userId);
  if (!user) throw new Error("User not found");
  const ok = await bcrypt.compare(currentPlain, user.password);
  if (!ok) throw new Error("Current password is incorrect");
  const hashed = await bcrypt.hash(newPlain, 12);
  user.password = hashed;
  await user.save();
  // optionally revoke sessions / refresh tokens - create logic to revoke session tokens for user
  await SessionModel.updateMany({ user: user._id }, { revokedAt: new Date() });
  return true;
}

/**
 * 2FA setup (returns secret and qr dataUrl). We do NOT enable 2FA until verified.
 * Save secret in profile.twoFactor.secret temporarily (encrypt in prod).
 */
export async function prepare2FA(userId: string) {
  const user = await UserModel.findById(userId);
  if (!user) throw new Error("User not found");

  const secret = generateTOTPSecret({
    name: "CourseHub",
    userEmail: user.email,
  });

  // save secret in profile (temporary)
  const profile = await StudentProfileModel.findOneAndUpdate(
    { user: userId },
    { $set: { "twoFactor.secret": secret.base32 } },
    { new: true, upsert: true }
  ).lean();

  // return otpauth_url / base32
  return { otpauth_url: secret.otpauth_url, base32: secret.base32 };
}

/**
 * Verify TOTPs and enable 2FA, generate recovery codes
 */
export async function enable2FA(userId: string, token: string) {
  const profile = await StudentProfileModel.findOne({ user: userId });
  if (!profile || !profile.twoFactor?.secret)
    throw new Error("TOTP not initialized");

  // verify token (use utils/totp.verifyTOTP)
  const { verifyTOTP } = await import("../../utils/totp");
  const ok = verifyTOTP(token, profile.twoFactor.secret!);
  if (!ok) throw new Error("Invalid TOTP code");

  // generate recovery codes (store hashed in prod)
  const codes = Array.from({ length: 5 }).map(() =>
    crypto.randomBytes(4).toString("hex").toUpperCase()
  );

  profile.twoFactor.enabled = true;
  profile.twoFactor.recoveryCodes = codes;
  await profile.save();

  // return plain recovery codes to user ONCE
  return codes;
}

/**
 * Disable 2FA (requires either a valid TOTP or a recovery code)
 */
export async function disable2FA(userId: string, tokenOrRecovery?: string) {
  const profile = await StudentProfileModel.findOne({ user: userId });
  if (!profile || !profile.twoFactor?.enabled)
    throw new Error("2FA not enabled");

  const { verifyTOTP } = await import("../../utils/totp");
  let ok = false;

  if (tokenOrRecovery) {
    ok = verifyTOTP(tokenOrRecovery, profile.twoFactor.secret || "");
    if (!ok) {
      // check recovery codes
      const idx = (profile.twoFactor.recoveryCodes || []).indexOf(
        tokenOrRecovery
      );
      if (idx !== -1) {
        // consume code
        profile.twoFactor.recoveryCodes!.splice(idx, 1);
        ok = true;
      }
    }
  }

  if (!ok) throw new Error("Invalid TOTP or recovery code");

  profile.twoFactor = { enabled: false };
  await profile.save();
  return true;
}

/**
 * Sessions: list user's sessions
 */
export async function listSessions(userId: string) {
  const sessions = await SessionModel.find({ user: userId })
    .sort({ lastActiveAt: -1 })
    .lean();
  return sessions;
}

/**
 * Revoke session by jti
 */
export async function revokeSession(userId: string, jti: string) {
  const s = await SessionModel.findOne({ user: userId, jti });
  if (!s) throw new Error("Session not found");
  s.revokedAt = new Date();
  await s.save();
  // also revoke refresh token in refreshToken collection if you have one.
  return true;
}

/**
 * Revoke all sessions except current (optionally)
 */
export async function revokeAllSessions(
  userId: string,
  exceptJti?: string | null
) {
  const q: any = { user: userId, revokedAt: null };
  if (exceptJti) q.jti = { $ne: exceptJti };
  await SessionModel.updateMany(q, { revokedAt: new Date() });
  return true;
}

/**
 * Connected accounts
 */
export async function listConnectedAccounts(userId: string) {
  return ConnectedAccountModel.find({ user: userId }).lean();
}

export async function disconnectProvider(userId: string, provider: string) {
  await ConnectedAccountModel.deleteOne({ user: userId, provider });
  return true;
}

/**
 * Soft-delete account: flag both User.deletedAt (or status) and StudentProfile.deletedAt
 * The actual deletion strategy depends on GDPR and retention rules.
 */
export async function deleteAccount(userId: string) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    await StudentProfileModel.updateOne(
      { user: userId },
      { $set: { deletedAt: new Date() } },
      { session }
    );
    await UserModel.findByIdAndUpdate(
      userId,
      { $set: { deletedAt: new Date(), status: "deleted" } },
      { session }
    );
    // revoke sessions
    await SessionModel.updateMany(
      { user: userId },
      { revokedAt: new Date() },
      { session }
    );
    await session.commitTransaction();
    session.endSession();
    return true;
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}
