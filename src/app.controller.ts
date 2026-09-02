import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './shared/decorators';
import { ResponseHelper } from './shared/helpers';

@Controller()
@ApiTags('App')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Service banner' })
  root() {
    return ResponseHelper.success({ name: 'nest-starter-blueprint' });
  }

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Liveness / readiness probe' })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        message: 'Operation completed successfully',
        data: { status: 'ok', uptimeSeconds: 12, timestamp: '2026-01-01T00:00:00.000Z' },
      },
    },
  })
  health() {
    return ResponseHelper.success(this.appService.getHealth());
  }
}
