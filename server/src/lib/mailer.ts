import nodemailer, { type Transporter } from 'nodemailer';
import type { EmailStatus } from '@prisma/client';
import { config } from '../config';
import { prisma } from './prisma';

let transporter: Transporter | null = null;
if (config.smtp) {
  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
  });
}

export const emailEnabled = () => !!transporter;

interface Mail {
  to: string;
  subject: string;
  html: string;
  text: string;
  kind: 'invite' | 'password_reset' | 'welcome' | 'request';
  companyId?: string | null;
}

/**
 * Sends the email if SMTP is configured, and always records it in the outbox.
 * Never throws: a mail failure must not break the action that triggered it.
 */
export async function sendMail(mail: Mail): Promise<EmailStatus> {
  let status: EmailStatus = 'OUTBOX';
  let error: string | null = null;
  if (transporter) {
    try {
      await transporter.sendMail({ from: config.mailFrom, to: mail.to, subject: mail.subject, html: mail.html, text: mail.text });
      status = 'SENT';
    } catch (err) {
      status = 'FAILED';
      error = err instanceof Error ? err.message.slice(0, 500) : 'Unknown error';
      console.error(`Email to ${mail.to} failed:`, error);
    }
  }
  await prisma.emailLog.create({
    data: { to: mail.to, subject: mail.subject, html: mail.html, kind: mail.kind, status, error, companyId: mail.companyId ?? null },
  });
  return status;
}

// ---- Templates ----------------------------------------------------------------

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Table-based layout with inline styles, so it renders in Gmail and Outlook. */
function layout(opts: { preheader: string; heading: string; body: string; cta: { label: string; url: string }; footer: string }) {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f3fb;font-family:Inter,Segoe UI,Arial,sans-serif;">
<span style="display:none;max-height:0;overflow:hidden;">${esc(opts.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3fb;padding:32px 12px;">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e7e7ef;">
    <tr><td style="background:#0b0b14;background-image:linear-gradient(135deg,#6d5dfc,#9b5cf6 55%,#d946ef);padding:28px 32px;">
      <span style="display:inline-block;width:34px;height:34px;border-radius:10px;background:rgba(255,255,255,0.18);color:#fff;font-weight:700;font-size:18px;line-height:34px;text-align:center;">W</span>
      <span style="color:#ffffff;font-size:18px;font-weight:600;vertical-align:middle;margin-left:10px;">WorkNest</span>
    </td></tr>
    <tr><td style="padding:32px;">
      <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#0f0f1a;">${esc(opts.heading)}</h1>
      <div style="font-size:15px;line-height:1.6;color:#4a4a5e;">${opts.body}</div>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;"><tr><td style="border-radius:12px;background:#6d5dfc;background-image:linear-gradient(135deg,#6d5dfc,#9b5cf6);">
        <a href="${esc(opts.cta.url)}" style="display:inline-block;padding:14px 26px;color:#ffffff;font-weight:600;font-size:15px;text-decoration:none;">${esc(opts.cta.label)} &rarr;</a>
      </td></tr></table>
      <p style="margin:0;font-size:12px;line-height:1.6;color:#8a8a9e;">Button not working? Paste this link into your browser:<br><a href="${esc(opts.cta.url)}" style="color:#6d5dfc;word-break:break-all;">${esc(opts.cta.url)}</a></p>
    </td></tr>
    <tr><td style="padding:18px 32px;background:#fafafe;border-top:1px solid #efeff5;font-size:12px;color:#8a8a9e;">${esc(opts.footer)}</td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

export function inviteEmail(opts: { inviterName: string; companyName: string; placement: string; link: string; isClient: boolean }) {
  const what = opts.isClient ? `the <b>${esc(opts.companyName)}</b> client portal` : `<b>${esc(opts.companyName)}</b> on WorkNest`;
  return {
    subject: `${opts.inviterName} invited you to join ${opts.companyName}`,
    html: layout({
      preheader: `Join ${opts.companyName} on WorkNest`,
      heading: `You're invited to ${opts.companyName}`,
      body: `<p style="margin:0 0 10px;"><b>${esc(opts.inviterName)}</b> invited you to ${what}.</p><p style="margin:0;">${esc(opts.placement)}</p>`,
      cta: { label: 'Accept invite', url: opts.link },
      footer: 'This link works once and expires in 7 days. If you weren’t expecting it, you can ignore this email.',
    }),
    text: `${opts.inviterName} invited you to join ${opts.companyName} on WorkNest.\n${opts.placement}\n\nAccept the invite: ${opts.link}\n\nThe link works once and expires in 7 days.`,
  };
}

export function passwordResetEmail(opts: { name: string; link: string; firstTime?: boolean }) {
  const heading = opts.firstTime ? 'Set your WorkNest password' : 'Reset your WorkNest password';
  return {
    subject: heading,
    html: layout({
      preheader: heading,
      heading,
      body: `<p style="margin:0;">Hi ${esc(opts.name.split(' ')[0])}, ${opts.firstTime ? 'your admin account is ready. Choose a password to sign in.' : 'we received a request to reset your password. Choose a new one below.'}</p>`,
      cta: { label: opts.firstTime ? 'Set password' : 'Reset password', url: opts.link },
      footer: 'This link works once and expires in 1 hour. If you didn’t ask for it, you can safely ignore this email.',
    }),
    text: `${heading}\n\nOpen this link to choose a password: ${opts.link}\n\nIt works once and expires in 1 hour.`,
  };
}

export function requestEmail(opts: { leadName: string; clientName: string; teamName: string; title: string; details: string; service?: string | null; link: string }) {
  return {
    subject: `New request from ${opts.clientName}: ${opts.title}`,
    html: layout({
      preheader: `${opts.clientName} sent the ${opts.teamName} team a request`,
      heading: `New request for ${opts.teamName}`,
      body: `<p style="margin:0 0 10px;">Hi ${esc(opts.leadName.split(' ')[0])}, <b>${esc(opts.clientName)}</b> would like to work with your team${opts.service ? ` on <b>${esc(opts.service)}</b>` : ''}.</p><p style="margin:0 0 6px;"><b>${esc(opts.title)}</b></p><p style="margin:0;white-space:pre-line;">${esc(opts.details)}</p>`,
      cta: { label: 'Review request', url: opts.link },
      footer: 'You are receiving this because you lead this team on WorkNest.',
    }),
    text: `${opts.clientName} sent the ${opts.teamName} team a request: ${opts.title}

${opts.details}

Review it: ${opts.link}`,
  };
}
