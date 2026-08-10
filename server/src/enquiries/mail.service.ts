import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

/**
 * Thin Nodemailer wrapper, isolated so swapping to Postmark/SES later is one
 * class - the same seam reasoning as StorageService in Phase 1b.
 *
 * Everything here degrades rather than throws. A notification that fails to send
 * must never fail the enquiry: the lead is already safely in the database, and
 * losing it because an SMTP host was briefly unreachable would be the worst
 * possible trade on a lead-generation site.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transport: nodemailer.Transporter | null = null;
  private readonly notifyTo: string | undefined;
  private readonly from: string;

  constructor(config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    const port = Number(config.get<string>('SMTP_PORT') ?? 587);
    const user = config.get<string>('SMTP_USER');
    const pass = config.get<string>('SMTP_PASS');
    this.notifyTo = config.get<string>('NOTIFY_EMAIL');
    this.from = config.get<string>('SMTP_FROM') ?? 'Solstice website <no-reply@solsticetrading.com>';

    if (!host) {
      this.logger.warn('SMTP_HOST is unset - enquiry notifications are disabled. Enquiries are still saved.');
      return;
    }
    this.transport = nodemailer.createTransport({
      host,
      port,
      // 465 is implicit TLS; everything else upgrades with STARTTLS.
      secure: port === 465,
      ...(user && pass ? { auth: { user, pass } } : {}),
    });
  }

  get enabled(): boolean {
    return Boolean(this.transport && this.notifyTo);
  }

  /** Returns true only when the SMTP server accepted the message. */
  async sendEnquiryNotification(enquiry: {
    id: string; name: string; email: string; phone: string; message: string; createdAt: Date;
  }): Promise<boolean> {
    if (!this.transport || !this.notifyTo) return false;

    // Plain text only. An HTML body here would be a second thing to sanitise for
    // no gain - nobody needs a styled internal notification.
    const body = [
      `New enquiry from the Solstice website.`,
      ``,
      `Name    : ${enquiry.name}`,
      `Email   : ${enquiry.email}`,
      `Phone   : ${enquiry.phone}`,
      `Received: ${enquiry.createdAt.toISOString()}`,
      ``,
      `Message:`,
      enquiry.message,
      ``,
      `Manage this enquiry in the admin panel under Enquiries (id ${enquiry.id}).`,
    ].join('\n');

    try {
      await this.transport.sendMail({
        from: this.from,
        to: this.notifyTo,
        // Replying goes to the buyer, not to the no-reply sender - the one
        // detail that makes a notification actionable instead of informational.
        replyTo: `${enquiry.name} <${enquiry.email}>`,
        subject: `New enquiry - ${enquiry.name}`,
        text: body,
      });
      return true;
    } catch (err) {
      this.logger.error(`Enquiry ${enquiry.id} saved but notification failed: ${(err as Error).message}`);
      return false;
    }
  }
}
