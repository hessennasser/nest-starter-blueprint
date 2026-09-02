import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from 'src/shared/dto/api-response.dto';
import { ArticleStatus } from '../enums/article-status.enum';

export class ArticleDto {
  @ApiProperty() id: string;
  @ApiProperty({ example: 'Hello world' }) title: string;
  @ApiProperty({ example: 'Body text…' }) body: string;
  @ApiProperty({ example: 'hello-world' }) slug: string;
  @ApiProperty({ enum: ArticleStatus }) status: ArticleStatus;
  @ApiProperty() authorId: string;
  @ApiProperty({ nullable: true, type: String }) publishedAt: string | null;
  @ApiProperty({ example: 0 }) viewCount: number;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class PaginatedArticlesDto {
  @ApiProperty({ type: [ArticleDto] }) items: ArticleDto[];
  @ApiProperty({ type: PaginationMetaDto }) meta: PaginationMetaDto;
  @ApiProperty({
    example: { DRAFT: 3, PUBLISHED: 10, ARCHIVED: 1 },
    description: 'Count per status for the unfiltered set.',
  })
  statusCounts: Record<string, number>;
}
