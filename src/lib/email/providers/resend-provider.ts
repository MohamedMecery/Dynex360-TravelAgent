import { Resend } from "resend";
import type { EmailProvider, EmailProviderSendInput, EmailProviderSendResult } from "@/lib/email/types";

export class ResendEmailProvider implements EmailProvider {
  readonly name = "resend";
  private readonly client: Resend;

  constructor(apiKey: string) {
    this.client = new Resend(apiKey);
  }

  async send(input: EmailProviderSendInput): Promise<EmailProviderSendResult> {
    const { data, error } = await this.client.emails.send({
      from: input.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });

    if (error) {
      throw new Error(error.message);
    }

    return { id: data?.id };
  }
}
