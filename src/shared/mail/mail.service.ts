import { readFileSync } from 'fs';
import { join } from 'path';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Handlebars from 'handlebars';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { AllConfigType } from 'src/config/config.type';

type TemplateName = 'base' | 'otp';

/**
 * Thin SMTP mailer. Templates are Handlebars files compiled once at boot and
 * wrapped in `base.hbs`. When `mail.enabled` is false (no host/creds) every
 * send is a logged no-op, so local dev needs no mail server.
 */
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter?: Transporter;
  private readonly templates = new Map<
    TemplateName,
    Handlebars.TemplateDelegate
  >();

  constructor(private readonly config: ConfigService<AllConfigType>) {}

  onModuleInit(): void {
    for (const name of ['base', 'otp'] as TemplateName[]) {
      const path = join(__dirname, 'templates', `${name}.hbs`);
      this.templates.set(name, Handlebars.compile(readFileSync(path, 'utf8')));
    }

    if (!this.config.get('mail.enabled', { infer: true })) {
      this.logger.warn('Mail disabled (no MAIL_HOST/MAIL_USER) — sends no-op.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: this.config.get('mail.host', { infer: true }),
      port: this.config.get('mail.port', { infer: true }),
      secure: this.config.get('mail.secure', { infer: true }),
      requireTLS: this.config.get('mail.requireTls', { infer: true }),
      auth: {
        user: this.config.get('mail.user', { infer: true }),
        pass: this.config.get('mail.password', { infer: true }),
      },
    });
  }

  /** Render `template` inside `base.hbs` and send it. */
  async send(params: {
    to: string;
    subject: string;
    template: Exclude<TemplateName, 'base'>;
    context: Record<string, unknown>;
  }): Promise<void> {
    const inner = this.templates.get(params.template)?.(params.context) ?? '';
    const html =
      this.templates.get('base')?.({
        subject: params.subject,
        body: new Handlebars.SafeString(inner),
        year: new Date().getFullYear(),
        brandName: this.config.get('mail.fromName', { infer: true }),
      }) ?? inner;

    if (!this.transporter) {
      this.logger.log(`[mail:noop] to=${params.to} subject="${params.subject}"`);
      return;
    }

    await this.transporter.sendMail({
      from: `"${this.config.get('mail.fromName', { infer: true })}" <${this.config.get('mail.fromEmail', { infer: true })}>`,
      to: params.to,
      subject: params.subject,
      html,
    });
  }
}
