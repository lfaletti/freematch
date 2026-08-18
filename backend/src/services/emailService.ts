import { Resend } from 'resend';

/**
 * emailService — transactional email via Resend (https://resend.com).
 *
 * Used by the auth flow to send:
 *   - Email verification links (registration + resend)
 *   - Password reset links
 *
 * Config:
 *   RESEND_API_KEY   — API key from Resend (starts with `re_`).
 *   EMAIL_FROM       — verified sender, e.g. "FreeMatch <no-reply@freematch.app>".
 *                      Must be a verified domain/address in Resend.
 *   FRONTEND_URL     — base URL of the web app (defaults to the staging one).
 *
 * When RESEND_API_KEY is missing the service is a no-op that logs a warning and
 * returns false — the auth routes fall back to exposing the token directly in
 * development (email-less mode) so local/testing keeps working without a key.
 */

const API_KEY = process.env.RESEND_API_KEY || '';
const FROM = process.env.EMAIL_FROM || 'FreeMatch <no-reply@freematch.app>';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://freematch-workspace.vercel.app';

// Singleton — resend SDK just wraps a fetch call, cheap to keep around.
let _client: Resend | null = null;
function client(): Resend | null {
  if (!API_KEY) return null;
  if (!_client) _client = new Resend(API_KEY);
  return _client;
}

export function isEmailEnabled(): boolean {
  return !!API_KEY;
}

/** Builds an absolute confirmation link for the web app. */
function verificationLink(token: string): string {
  return `${FRONTEND_URL}/verify-email?token=${encodeURIComponent(token)}`;
}

/** Builds an absolute reset link for the web app. */
function resetLink(token: string): string {
  return `${FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}`;
}

/**
 * Sends an email verification link to the user.
 * Returns true when the email was accepted by Resend.
 */
export async function sendVerificationEmail(to: string, token: string): Promise<boolean> {
  const c = client();
  if (!c) {
    console.warn('emailService: RESEND_API_KEY not set, skipping verification email to', to);
    return false;
  }
  try {
    await c.emails.send({
      from: FROM,
      to,
      subject: 'FreeMatch — Verify your email',
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;padding:24px">
          <h2 style="color:#ff2d55">FreeMatch 💘</h2>
          <p>Hola! Confirmá tu email para activar tu cuenta.</p>
          <p><a href="${verificationLink(token)}"
                style="display:inline-block;padding:12px 24px;background:#ff2d55;color:#fff;border-radius:8px;text-decoration:none">
                Confirmar email</a></p>
          <p style="color:#888;font-size:13px">El link vence en 24 horas. Si no creaste una cuenta, ignorá este mail.</p>
        </div>`,
    });
    return true;
  } catch (err) {
    console.error('emailService: failed to send verification email:', err);
    return false;
  }
}

/**
 * Sends a password reset link to the user (link valid 15 min).
 * Returns true when the email was accepted by Resend.
 */
export async function sendPasswordResetEmail(to: string, token: string): Promise<boolean> {
  const c = client();
  if (!c) {
    console.warn('emailService: RESEND_API_KEY not set, skipping password reset email to', to);
    return false;
  }
  try {
    await c.emails.send({
      from: FROM,
      to,
      subject: 'FreeMatch — Reset your password',
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;padding:24px">
          <h2 style="color:#ff2d55">FreeMatch 💘</h2>
          <p>Recibimos un pedido para resetear tu contraseña.</p>
          <p><a href="${resetLink(token)}"
                style="display:inline-block;padding:12px 24px;background:#ff2d55;color:#fff;border-radius:8px;text-decoration:none">
                Elegir nueva contraseña</a></p>
          <p style="color:#888;font-size:13px">El link vence en 15 minutos. Si no pediste un reset, ignorá este mail.</p>
        </div>`,
    });
    return true;
  } catch (err) {
    console.error('emailService: failed to send password reset email:', err);
    return false;
  }
}
