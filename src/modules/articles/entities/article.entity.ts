import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { EntityRelationalHelper } from 'src/shared/helpers/relational-entity.helper';
import type { LocalizedString } from 'src/shared/helpers/language.helper';
import { User } from '../../users/entities/user.entity';
import { ArticleStatus } from '../enums/article-status.enum';

/**
 * Reference entity. Note the patterns reused across the codebase:
 *  - extends `EntityRelationalHelper` (uuid id + timestamptz created/updated)
 *  - user-facing text is a JSONB `{ en, ar }` map, never a bare varchar
 *  - snake_case column names via the `name:` option; camelCase properties
 *  - a status enum column with an index, for filtered list queries
 *  - `authorId` scalar FK alongside the relation, so you can filter without a join
 */
@Entity({ name: 'articles' })
@Index(['status'])
@Index(['slug'], { unique: true })
export class Article extends EntityRelationalHelper {
  @Column({ type: 'jsonb' })
  title: LocalizedString;

  @Column({ type: 'jsonb' })
  body: LocalizedString;

  @Column({ type: 'varchar', length: 160 })
  slug: string;

  @Column({
    type: 'enum',
    enum: ArticleStatus,
    default: ArticleStatus.DRAFT,
  })
  status: ArticleStatus;

  @Column({ type: 'uuid', name: 'author_id' })
  authorId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'author_id' })
  author?: User;

  @Column({ type: 'timestamptz', nullable: true, name: 'published_at' })
  publishedAt?: Date | null;

  @Column({ type: 'int', default: 0, name: 'view_count' })
  viewCount: number;
}
