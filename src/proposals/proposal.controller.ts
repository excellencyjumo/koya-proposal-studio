import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Headers,
  Query,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException
} from '@nestjs/common';
import { Response } from 'express';
import { ProposalService } from './proposal.service';
import { ProposalReminderService } from './proposal-reminder.service';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('api/proposals')
export class ProposalController {
  constructor(
    private readonly proposalService: ProposalService,
    private readonly reminderService: ProposalReminderService
  ) {}

  @Get('cron/status')
  getCronStatus() {
    return this.reminderService.getStatus();
  }

  @Post('cron/check-reminders')
  async checkReminders(@Query('force') force: string) {
    return this.reminderService.checkAndSendReminders({ force: force === 'true' });
  }

  @Post('test-email')
  @HttpCode(HttpStatus.OK)
  async testEmail(@Body() body: any) {
    const targetEmail = body?.email || 'excellencejumo@gmail.com';
    return this.proposalService.testDirectEmail(targetEmail);
  }

  @Post('internal/relay-email')
  @HttpCode(HttpStatus.OK)
  async relayEmail(@Body() body: any) {
    return this.proposalService.relayEmailDirect(body);
  }

  @Post('generate')
  @UseGuards(OptionalJwtAuthGuard)
  async generate(
    @Body() body: any,
    @Headers('idempotency-key') idempotencyHeaderKey: string,
    @CurrentUser() user: any,
    @Query('inject') injectFaultQuery: string,
    @Res() res: Response
  ) {
    // Governance Rule: Initial proposal creation is strictly reserved for Sales Reps
    if (user?.role === 'manager') {
      throw new ForbiddenException({
        success: false,
        error: 'Manager Creation Restricted',
        code: 'MANAGER_CREATION_RESTRICTED',
        message:
          'Governance Policy: Managers are not authorized to create initial proposals. Initial proposal generation is strictly reserved for Sales Representatives. Managers are authorized for review, revisions, and approvals.'
      });
    }

    const injectFault = injectFaultQuery || body?.inject_fault;
    const result = await this.proposalService.generateProposal(
      body?.intake_data,
      body?.supporting_material,
      idempotencyHeaderKey,
      user,
      injectFault
    );

    const statusCode = (result as any).idempotent_replay
      ? HttpStatus.OK
      : HttpStatus.CREATED;
    return res.status(statusCode).json(result);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async getAll(@CurrentUser() user: any) {
    if (!user || user.id === 'usr_anonymous') {
      return {
        success: true,
        count: 0,
        proposals: [],
        message: 'Authentication required to view internal enterprise proposals'
      };
    }
    const proposals = await this.proposalService.getProposals();
    return {
      success: true,
      count: proposals.length,
      proposals
    };
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.proposalService.getProposalById(id);
  }

  @Put(':id/section')
  @UseGuards(OptionalJwtAuthGuard)
  updateSection(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: any
  ) {
    const actor = body.actor || user?.name || 'Sales Representative';
    return this.proposalService.updateSection(id, body.section_key, body.content, actor, user);
  }

  @Post(':id/regenerate-section')
  @HttpCode(HttpStatus.OK)
  @UseGuards(OptionalJwtAuthGuard)
  async regenerateSection(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: any,
    @Query('inject') injectFaultQuery: string
  ) {
    const actor = body.actor || user?.name || 'Sales Representative';
    const injectFault = injectFaultQuery || body?.inject_fault;
    return this.proposalService.regenerateSection(
      id,
      body.section_key,
      body.instruction,
      actor,
      injectFault,
      user
    );
  }

  @Post(':id/submit-for-approval')
  @HttpCode(HttpStatus.OK)
  @UseGuards(OptionalJwtAuthGuard)
  async submitForApproval(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: any
  ) {
    const actor = body.actor || user?.name || 'Sarah Chen';
    return this.proposalService.submitForApproval(id, actor, {
      host: req.get('host'),
      protocol: req.protocol
    });
  }

  @Post(':id/test-slack')
  @HttpCode(HttpStatus.OK)
  @UseGuards(OptionalJwtAuthGuard)
  async testSlack(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: any
  ) {
    const actor = body.actor || user?.name || 'Test Harness';
    return this.proposalService.testSlack(id, actor, {
      host: req.get('host'),
      protocol: req.protocol,
      webhook_url: body?.webhook_url,
      channel: body?.channel
    });
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('manager')
  approve(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: any
  ) {
    return this.proposalService.approveProposal(id, user, body?.feedback_notes, {
      host: req.get('host'),
      protocol: req.protocol
    });
  }

  @Post(':id/request-changes')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('manager')
  requestChanges(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: any
  ) {
    return this.proposalService.requestChanges(id, user, body?.feedback_notes);
  }

  @Post(':id/deliver')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('sales', 'manager')
  deliver(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: any
  ) {
    return this.proposalService.deliverProposal(
      id,
      user,
      body?.client_email,
      {
        host: req.get('host'),
        protocol: req.protocol
      },
      {
        cc: body?.cc
      }
    );
  }

  @Post(':id/send-email')
  @HttpCode(HttpStatus.OK)
  @UseGuards(OptionalJwtAuthGuard)
  async sendEmail(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: any
  ) {
    const actor = user?.name || 'Sales Representative';
    return this.proposalService.sendProposalEmailDirect(
      id,
      body?.email,
      actor,
      {
        host: req.get('host'),
        protocol: req.protocol
      },
      {
        cc: body?.cc
      }
    );
  }

  @Get(':id/export-eml')
  exportEml(@Param('id') id: string, @Req() req: any, @Res() res: Response) {
    const result = this.proposalService.exportEml(id, {
      host: req.get('host'),
      protocol: req.protocol
    });

    res.setHeader('Content-Type', 'message/rfc822');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    return res.send(result.content);
  }

  @Get(':id/public')
  getPublic(@Param('id') id: string, @Query('token') token?: string) {
    return this.proposalService.getPublicView(id, token);
  }

  @Post(':id/send-otp')
  @HttpCode(HttpStatus.OK)
  async sendSigningOtp(
    @Param('id') id: string,
    @Body() body: any
  ) {
    const token = body?.token;
    return this.proposalService.sendSigningOtp(id, token);
  }

  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
  async accept(
    @Param('id') id: string,
    @Body() body: any
  ) {
    const signerName = body?.signer_name || body?.name || body?.signerName;
    const signerTitle = body?.signer_title || body?.title || body?.signerTitle;
    const token = body?.token;
    const otp = body?.otp || body?.code;
    return this.proposalService.acceptProposal(id, signerName, signerTitle, token, otp);
  }

  @Get(':id/export-audit-csv')
  exportAuditCsv(@Param('id') id: string, @Res() res: Response) {
    const result = this.proposalService.exportAuditCsv(id);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    return res.send(result.content);
  }

  @Post(':id/request-client-revision')
  @UseGuards(OptionalJwtAuthGuard)
  async requestClientRevision(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: any
  ) {
    const feedback = body?.client_feedback || body?.feedback || 'Customer requested revisions to proposal scope or terms.';
    const actor = body?.actor || user?.name || 'Sarah Chen';
    const token = body?.token;
    return this.proposalService.requestClientRevision(id, feedback, actor, token);
  }

  @Post(':id/approve-revision-unlock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('manager')
  async approveRevisionUnlock(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: any
  ) {
    const notes = body?.approval_notes || body?.notes || 'Manager approved unlocking document for client revisions.';
    return this.proposalService.approveRevisionUnlock(id, notes, user);
  }


  @Post(':id/simulate-failure')
  @UseGuards(OptionalJwtAuthGuard)
  async simulateFailure(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: any,
    @Req() req: any,
    @Res() res: Response
  ) {
    if (process.env.DEMO_MODE === 'false') {
      return res.status(HttpStatus.FORBIDDEN).json({
        success: false,
        error: 'Simulation Disabled',
        message: 'Failure simulation is only permitted when DEMO_MODE is enabled.'
      });
    }

    const result = await this.proposalService.simulateFailure(
      id,
      body?.failure_type || 'claude_timeout',
      req.id || ''
    );

    if ((result as any).caught) {
      return res.status(HttpStatus.BAD_GATEWAY).json(result);
    }
    return res.json(result);
  }
}
