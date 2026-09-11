import { Module } from '@nestjs/common';
import { ProposalController } from './proposal.controller';
import { ProposalService } from './proposal.service';
import { ProposalReminderService } from './proposal-reminder.service';
import { SlackModule } from '../slack/slack.module';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [SlackModule, AuthModule, EmailModule],
  controllers: [ProposalController],
  providers: [ProposalService, ProposalReminderService],
  exports: [ProposalService, ProposalReminderService]
})
export class ProposalModule {}

