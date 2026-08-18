import nodemailer from "nodemailer";

const getSmtpConfig = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM_EMAIL;

  if (!host || !Number.isInteger(port) || port <= 0 || !user || !password || !from) {
    throw new Error("SMTP configuration is incomplete.");
  }

  return {
    host,
    port,
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass: password },
    from,
  };
};

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const config = getSmtpConfig();
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });

  await transporter.sendMail({
    from: config.from,
    to,
    subject: "Reset your Am I Normal? password",
    text: [
      "We received a request to reset your Am I Normal? password.",
      "",
      `Reset your password: ${resetUrl}`,
      "",
      "This link expires in one hour and can only be used once.",
      "If you did not request this, you can safely ignore this email.",
    ].join("\n"),
    html: `
      <p>We received a request to reset your <strong>Am I Normal?</strong> password.</p>
      <p><a href="${resetUrl}">Reset your password</a></p>
      <p>This link expires in one hour and can only be used once.</p>
      <p>If you did not request this, you can safely ignore this email.</p>
    `,
  });
}