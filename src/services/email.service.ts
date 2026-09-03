import nodemailer, { SendMailOptions, Transporter } from 'nodemailer';
import { env } from '../config/env';
import { HTTP_STATUS } from '../constants/http-status';
import { AppError } from '../utils/AppError';

type SendPasswordResetOtpEmailParams = {
  to: string;
  fullName: string | null;
  otp: string;
  expiresInMinutes: number;
};

type EmailContent = {
  subject: string;
  text: string;
  html: string;
};

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromName: string;
  fromEmail: string;
};

let transporter: Transporter | null = null;

/**
 * SMTP configuration is optional during application startup.
 *
 * It becomes required only when an email needs to be sent.
 */
const getSmtpConfig = (): SmtpConfig => {
  if (
    !env.SMTP_HOST ||
    !env.SMTP_PORT ||
    env.SMTP_SECURE === undefined ||
    !env.SMTP_USER ||
    !env.SMTP_PASSWORD ||
    !env.SMTP_FROM_NAME ||
    !env.SMTP_FROM_EMAIL
  ) {
    throw new AppError(
      'Email service is not configured',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }

  return {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    user: env.SMTP_USER,
    password: env.SMTP_PASSWORD,
    fromName: env.SMTP_FROM_NAME,
    fromEmail: env.SMTP_FROM_EMAIL
  };
};

const getTransporter = (): Transporter => {
  if (!transporter) {
    const smtp = getSmtpConfig();

    transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: {
        user: smtp.user,
        pass: smtp.password
      }
    });
  }

  return transporter;
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatFromAddress = (): string => {
  const smtp = getSmtpConfig();

  const fromName = smtp.fromName.replace(/"/g, '\\"');

  return `"${fromName}" <${smtp.fromEmail}>`;
};

const logDevelopmentOtp = (
  to: string,
  otp: string
): void => {
  if (env.NODE_ENV === 'development') {
    console.info(`Password reset OTP for ${to}: ${otp}`);
  }
};

const buildPasswordResetOtpEmail = ({
  fullName,
  otp,
  expiresInMinutes
}: SendPasswordResetOtpEmailParams): EmailContent => {
  const recipientName = fullName?.trim() || 'there';

  const subject =
    'SportLedger Password Reset Verification';

  const text = [
    'SportLedger',
    'Password Reset Verification',
    '',
    `Hello ${recipientName},`,
    '',
    'Your OTP for resetting your SportLedger password is:',
    '',
    otp,
    '',
    `This OTP expires in ${expiresInMinutes} minutes.`,
    '',
    'If you did not request a password reset, you can ignore this email.'
  ].join('\n');

  const safeRecipientName =
    escapeHtml(recipientName);

  const safeOtp =
    escapeHtml(otp);

  const safeExpiresInMinutes =
    escapeHtml(String(expiresInMinutes));

  const html = [
    '<!doctype html>',
    '<html lang="en">',
    '<body>',
    '<h1>SportLedger</h1>',
    '<h2>Password Reset Verification</h2>',
    `<p>Hello ${safeRecipientName},</p>`,
    '<p>Your OTP for resetting your SportLedger password is:</p>',
    `<p><strong>${safeOtp}</strong></p>`,
    `<p>This OTP expires in ${safeExpiresInMinutes} minutes.</p>`,
    '<p>If you did not request a password reset, you can ignore this email.</p>',
    '</body>',
    '</html>'
  ].join('');

  return {
    subject,
    text,
    html
  };
};

const sendEmail = async (
  message: SendMailOptions
): Promise<void> => {
  try {
    await getTransporter().sendMail(message);
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Unknown email error';

    console.error(
      'Failed to send authentication email',
      {
        message: errorMessage
      }
    );

    throw new AppError(
      'Unable to send authentication email',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
};

export const sendPasswordResetOtpEmail = async (
  params: SendPasswordResetOtpEmailParams
): Promise<void> => {
  const email =
    buildPasswordResetOtpEmail(params);

  logDevelopmentOtp(
    params.to,
    params.otp
  );

  await sendEmail({
    from: formatFromAddress(),
    to: params.to,
    subject: email.subject,
    text: email.text,
    html: email.html
  });
};