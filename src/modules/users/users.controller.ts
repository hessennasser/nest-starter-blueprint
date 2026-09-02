import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PermissionKey } from 'src/shared/constants/permission-keys';
import { RequirePermissions } from 'src/shared/decorators';
import { SuccessResponseDto } from 'src/shared/dto/api-response.dto';
import { PermissionsGuard } from 'src/shared/guards/permissions.guard';
import { ResponseHelper } from 'src/shared/helpers';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginatedUsersDto, UserDto } from './dto/user-response.dto';
import { presentUser, presentUsersPage } from './users.presenter';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PermissionKey.MANAGE_USERS)
@ApiTags('Users')
@ApiBearerAuth('access-token')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users (paginated, filterable)' })
  @ApiOkResponse({ type: PaginatedUsersDto })
  async list(@Query() query: ListUsersQueryDto) {
    return ResponseHelper.paginated(
      presentUsersPage(await this.usersService.list(query)),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one user' })
  @ApiOkResponse({ type: UserDto })
  async get(@Param('id', ParseUUIDPipe) id: string) {
    return ResponseHelper.success(
      presentUser(await this.usersService.findByIdOrThrow(id)),
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create a user' })
  @ApiOkResponse({ type: UserDto })
  async create(@Body() dto: CreateUserDto) {
    return ResponseHelper.created(presentUser(await this.usersService.create(dto)));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user' })
  @ApiOkResponse({ type: UserDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return ResponseHelper.updated(
      presentUser(await this.usersService.update(id, dto)),
    );
  }

  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Soft-delete a user' })
  @ApiOkResponse({ type: SuccessResponseDto })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.usersService.remove(id);
    return ResponseHelper.deleted();
  }
}
