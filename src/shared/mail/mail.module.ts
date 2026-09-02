import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';

/**
 * Global so any feature module can inject `MailService` without importing this.
 * Templates ship as assets (see nest-cli.json `assets`).
 */
@Global()
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
