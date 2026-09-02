import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { buildStatusCounts } from 'src/shared/helpers/status-counts.helper';
import { PaginatedResponse } from 'src/shared/pagination/paginated-response';
import { paginateQuery } from 'src/shared/pagination/pagination.util';
import { Article } from '../entities/article.entity';
import { ARTICLE_STATUSES, ArticleStatus } from '../enums/article-status.enum';
import { ListArticlesQueryDto } from '../dto/list-articles-query.dto';

/**
 * Read side of the module. Splitting queries out of `ArticlesService` keeps the
 * facade small and means list/detail logic (joins, filters, status rollups)
 * evolves without touching the write path. Larger modules add more of these
 * (`*-creation.service`, `*-lifecycle.service`, …).
 */
@Injectable()
export class ArticlesQueryService {
  constructor(
    @InjectRepository(Article)
    private readonly articles: Repository<Article>,
  ) {}

  async list(
    query: ListArticlesQueryDto,
  ): Promise<PaginatedResponse<Article>> {
    const qb = this.articles
      .createQueryBuilder('article')
      .orderBy(
        'article.createdAt',
        query.order === 'ASC' ? 'ASC' : 'DESC',
      );

    if (query.status) {
      qb.andWhere('article.status = :status', { status: query.status });
    }
    if (query.search) {
      qb.andWhere("article.title ->> 'en' ILIKE :q", {
        q: `%${query.search}%`,
      });
    }

    return paginateQuery(qb, query);
  }

  /** Zero-filled count per status, ignoring the status filter itself. */
  async statusCounts(
    query: ListArticlesQueryDto,
  ): Promise<Record<ArticleStatus, number>> {
    const qb = this.articles
      .createQueryBuilder('article')
      .select('article.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('article.status');

    if (query.search) {
      qb.andWhere("article.title ->> 'en' ILIKE :q", {
        q: `%${query.search}%`,
      });
    }

    const rows = await qb.getRawMany<{ status: ArticleStatus; count: string }>();
    return buildStatusCounts(ARTICLE_STATUSES, rows);
  }

  async findByIdOrThrow(id: string): Promise<Article> {
    const article = await this.articles.findOne({ where: { id } });
    if (!article) throw new NotFoundException('Article not found');
    return article;
  }
}
