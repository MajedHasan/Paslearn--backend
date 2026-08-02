"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendVerificationEmail = sendVerificationEmail;
exports.sendPasswordResetEmail = sendPasswordResetEmail;
// A very small "email" utility. In dev it logs the link; in prod replace with nodemailer/sendgrid/etc.
async function sendVerificationEmail(to, token) {
    const link = `http://localhost:3000/api/auth/verify-email?token=${token}`;
    // In production you'd send this link in an email. For dev we return it.
    console.info(`VERIFICATION EMAIL -> to=${to} link=${link}`);
    return { to, link };
}
async function sendPasswordResetEmail(to, token) {
    const link = `http://localhost:3000/api/auth/reset-password?token=${token}`;
    console.info(`PASSWORD RESET EMAIL -> to=${to} link=${link}`);
    return { to, link };
}
