import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article } from './entities/article.entity';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';
import { ArticlesQueryService } from './services/articles-query.service';
import { ArticlePolicyService } from './policies/article-policy.service';

/**
 * The shape every feature module follows:
 *   TypeOrmModule.forFeature([...entities])   — repositories
 *   controllers: [...]                        — HTTP surface
 *   providers:   [facade, ...sub-services, policy]
 *   exports:     [facade]                     — only what other modules may call
 */
@Module({
  imports: [TypeOrmModule.forFeature([Article])],
  controllers: [ArticlesController],
  providers: [ArticlesService, ArticlesQueryService, ArticlePolicyService],
  exports: [ArticlesService],
})
export class ArticlesModule {}
