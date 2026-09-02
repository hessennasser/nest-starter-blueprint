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
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { PermissionKey } from 'src/shared/constants/permission-keys';
import {
  CurrentUser,
  RequireAnyPermissions,
  RequirePermissions,
} from 'src/shared/decorators';
import { SuccessResponseDto } from 'src/shared/dto/api-response.dto';
import { PermissionsGuard } from 'src/shared/guards/permissions.guard';
import { ResponseHelper } from 'src/shared/helpers';
import { resolveLanguage } from 'src/shared/helpers/language.helper';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ArticlesService } from './articles.service';
import {
  ArticleDto,
  CreateArticleDto,
  ListArticlesQueryDto,
  PaginatedArticlesDto,
  UpdateArticleDto,
} from './dto';
import { presentArticle, presentArticlesPage } from './articles.presenter';

@Controller('articles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiTags('Articles')
@ApiBearerAuth('access-token')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  private lang(req: Request) {
    return resolveLanguage(req.headers['accept-language']);
  }

  @Get()
  @RequireAnyPermissions(
    PermissionKey.VIEW_ARTICLES,
    PermissionKey.MANAGE_ARTICLES,
  )
  @ApiOperation({ summary: 'List articles (paginated, filterable)' })
  @ApiOkResponse({ type: PaginatedArticlesDto })
  async list(@Req() req: Request, @Query() query: ListArticlesQueryDto) {
    const [page, statusCounts] = await Promise.all([
      this.articlesService.list(query),
      this.articlesService.statusCounts(query),
    ]);
    return ResponseHelper.paginated(
      presentArticlesPage(page, this.lang(req), statusCounts),
    );
  }

  @Get(':id')
  @RequireAnyPermissions(
    PermissionKey.VIEW_ARTICLES,
    PermissionKey.MANAGE_ARTICLES,
  )
  @ApiOperation({ summary: 'Get one article' })
  @ApiOkResponse({ type: ArticleDto })
  async get(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string) {
    return ResponseHelper.success(
      presentArticle(await this.articlesService.getById(id), this.lang(req)),
    );
  }

  @Post()
  @RequirePermissions(PermissionKey.MANAGE_ARTICLES)
  @ApiOperation({ summary: 'Create a draft article' })
  @ApiOkResponse({ type: ArticleDto })
  async create(
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateArticleDto,
  ) {
    return ResponseHelper.created(
      presentArticle(
        await this.articlesService.create(user, dto),
        this.lang(req),
      ),
    );
  }

  @Patch(':id')
  @RequirePermissions(PermissionKey.MANAGE_ARTICLES)
  @ApiOperation({ summary: 'Update an article' })
  @ApiOkResponse({ type: ArticleDto })
  async update(
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateArticleDto,
  ) {
    return ResponseHelper.updated(
      presentArticle(
        await this.articlesService.update(user, id, dto),
        this.lang(req),
      ),
    );
  }

  @Patch(':id/publish')
  @RequirePermissions(PermissionKey.PUBLISH_ARTICLES)
  @ApiOperation({ summary: 'Publish an article' })
  @ApiOkResponse({ type: ArticleDto })
  async publish(
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return ResponseHelper.updated(
      presentArticle(
        await this.articlesService.publish(user, id),
        this.lang(req),
      ),
    );
  }

  @Delete(':id')
  @HttpCode(200)
  @RequirePermissions(PermissionKey.MANAGE_ARTICLES)
  @ApiOperation({ summary: 'Delete an article' })
  @ApiOkResponse({ type: SuccessResponseDto })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.articlesService.remove(user, id);
    return ResponseHelper.deleted();
  }
}
