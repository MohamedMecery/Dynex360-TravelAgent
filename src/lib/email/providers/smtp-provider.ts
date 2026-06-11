import nodemailer from "nodemailer";
import type { EmailProvider, EmailProviderSendInput, EmailProviderSendResult } from "@/lib/email/types";

export class SmtpEmailProvider implements EmailProvider {
  readonly name = "smtp";
  private readonly transport: nodemailer.Transporter;

  constructor() {
    const port = Number(process.env.SMTP_PORT ?? "587");
    const secure = process.env.SMTP_SECURE === "true" || port === 465;

    this.transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  async send(input: EmailProviderSendInput): Promise<EmailProviderSendResult> {
    const info = await this.transport.sendMail({
      from: input.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });

    return { id: info.messageId };
  }
}
