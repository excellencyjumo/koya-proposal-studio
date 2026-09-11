import { Controller, Get, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { SlackService } from './slack.service';

@Controller('api/slack')
export class SlackController {
  constructor(private readonly slackService: SlackService) {}

  @Get('status')
  async getStatus() {
    return this.slackService.verifySlackAuth();
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  async sendTest(@Body() body: { channel?: string; webhook_url?: string; message?: string }) {
    const result = await this.slackService.sendTestPing({
      channel: body?.channel,
      webhook_url: body?.webhook_url,
      message: body?.message
    });
    return {
      success: result.dispatched,
      result
    };
  }
}
