import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DEFAULT_LANG,
  localizeString,
  normalizeLocalizedString,
} from 'src/shared/helpers/language.helper';
import { PaginatedResponse } from 'src/shared/pagination/paginated-response';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { Article } from './entities/article.entity';
import { ArticleStatus } from './enums/article-status.enum';
import { CreateArticleDto } from './dto/create-article.dto';
import { ListArticlesQueryDto } from './dto/list-articles-query.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { ArticlePolicyService } from './policies/article-policy.service';
import { ArticlesQueryService } from './services/articles-query.service';

/**
 * The module facade: one class the controller talks to. It owns the write path
 * and delegates reads to `ArticlesQueryService` and authorization checks to
 * `ArticlePolicyService`. Controllers never inject the sub-services directly.
 */
@Injectable()
export class ArticlesService {
  constructor(
    @InjectRepository(Article)
    private readonly articles: Repository<Article>,
    private readonly queryService: ArticlesQueryService,
    private readonly policy: ArticlePolicyService,
  ) {}

  list(query: ListArticlesQueryDto): Promise<PaginatedResponse<Article>> {
    return this.queryService.list(query);
  }

  statusCounts(query: ListArticlesQueryDto) {
    return this.queryService.statusCounts(query);
  }

  getById(id: string): Promise<Article> {
    return this.queryService.findByIdOrThrow(id);
  }

  async create(
    actor: AuthenticatedUser,
    dto: CreateArticleDto,
  ): Promise<Article> {
    const title = normalizeLocalizedString(dto.title);
    const slug =
      dto.slug ?? this.slugify(localizeString(title, DEFAULT_LANG) ?? '');

    if (await this.articles.findOne({ where: { slug } })) {
      throw new ConflictException(`Slug '${slug}' is already taken`);
    }

    return this.articles.save(
      this.articles.create({
        title,
        body: normalizeLocalizedString(dto.body),
        slug,
        status: ArticleStatus.DRAFT,
        authorId: actor.id,
      }),
    );
  }

  async update(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateArticleDto,
  ): Promise<Article> {
    const article = await this.queryService.findByIdOrThrow(id);
    this.policy.assertCanEdit(actor, article);

    if (dto.title !== undefined) {
      article.title = normalizeLocalizedString(dto.title);
    }
    if (dto.body !== undefined) {
      article.body = normalizeLocalizedString(dto.body);
    }
    if (dto.slug !== undefined && dto.slug !== article.slug) {
      if (await this.articles.findOne({ where: { slug: dto.slug } })) {
        throw new ConflictException(`Slug '${dto.slug}' is already taken`);
      }
      article.slug = dto.slug;
    }
    return this.articles.save(article);
  }

  async publish(actor: AuthenticatedUser, id: string): Promise<Article> {
    const article = await this.queryService.findByIdOrThrow(id);
    this.policy.assertCanPublish(actor);
    article.status = ArticleStatus.PUBLISHED;
    article.publishedAt = article.publishedAt ?? new Date();
    return this.articles.save(article);
  }

  async archive(actor: AuthenticatedUser, id: string): Promise<Article> {
    const article = await this.queryService.findByIdOrThrow(id);
    this.policy.assertCanEdit(actor, article);
    article.status = ArticleStatus.ARCHIVED;
    return this.articles.save(article);
  }

  async remove(actor: AuthenticatedUser, id: string): Promise<void> {
    const article = await this.queryService.findByIdOrThrow(id);
    this.policy.assertCanDelete(actor, article);
    await this.articles.remove(article);
  }

  private slugify(text: string): string {
    return (
      text
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 150) || `article-${Date.now()}`
    );
  }
}
