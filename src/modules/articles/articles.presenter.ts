import {
  DEFAULT_LANG,
  localizeString,
} from 'src/shared/helpers/language.helper';
import { PaginatedResponse } from 'src/shared/pagination/paginated-response';
import { Article } from './entities/article.entity';
import { ArticleStatus } from './enums/article-status.enum';
import { ArticleDto, PaginatedArticlesDto } from './dto/article-response.dto';

/**
 * Entity → DTO. Localized `{ en, ar }` columns collapse to a single string for
 * the caller's language here — the ONLY layer allowed to do that. Keep these
 * functions pure so they are trivial to unit test.
 */
export const presentArticle = (
  article: Article,
  lang = DEFAULT_LANG,
): ArticleDto => ({
  id: article.id,
  title: localizeString(article.title, lang) ?? '',
  body: localizeString(article.body, lang) ?? '',
  slug: article.slug,
  status: article.status,
  authorId: article.authorId,
  publishedAt: article.publishedAt
    ? article.publishedAt.toISOString()
    : null,
  viewCount: article.viewCount,
  createdAt: article.createdAt,
  updatedAt: article.updatedAt,
});

export const presentArticlesPage = (
  page: PaginatedResponse<Article>,
  lang = DEFAULT_LANG,
  statusCounts: Partial<Record<ArticleStatus, number>> = {},
): PaginatedArticlesDto => ({
  items: page.items.map((article) => presentArticle(article, lang)),
  meta: page.meta,
  statusCounts,
});
