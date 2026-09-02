import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserType } from 'src/shared/enums/user-type.enum';
import { PermissionKey } from 'src/shared/constants/permission-keys';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { Article } from '../entities/article.entity';
import { ArticleStatus } from '../enums/article-status.enum';
import { ArticlesService } from '../articles.service';
import { ArticlesQueryService } from '../services/articles-query.service';
import { ArticlePolicyService } from '../policies/article-policy.service';

const actor = (over: Partial<AuthenticatedUser> = {}): AuthenticatedUser => ({
  id: 'user-1',
  email: 'a@b.com',
  fullName: 'A',
  userType: UserType.USER,
  status: 'ACTIVE' as never,
  permissionCodes: [],
  roleIds: [],
  ...over,
});

describe('ArticlesService', () => {
  const repo = {
    findOne: jest.fn(),
    create: jest.fn((v) => v),
    save: jest.fn((v) => ({ id: 'a-1', ...v })),
    remove: jest.fn(),
  };
  const queryService = { findByIdOrThrow: jest.fn() };
  let service: ArticlesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ArticlesService,
        ArticlePolicyService,
        { provide: getRepositoryToken(Article), useValue: repo },
        { provide: ArticlesQueryService, useValue: queryService },
      ],
    }).compile();
    service = moduleRef.get(ArticlesService);
  });

  it('creates a draft and derives a slug from the English title', async () => {
    repo.findOne.mockResolvedValue(null);
    const created = await service.create(actor(), {
      title: { en: 'Hello World', ar: 'مرحبا' },
      body: { en: 'x', ar: 'x' },
    });
    expect(created.slug).toBe('hello-world');
    expect(created.status).toBe(ArticleStatus.DRAFT);
    expect(created.authorId).toBe('user-1');
  });

  it('rejects a duplicate slug', async () => {
    repo.findOne.mockResolvedValue({ id: 'other' });
    await expect(
      service.create(actor(), {
        title: { en: 'Taken', ar: 'x' },
        body: { en: 'x', ar: 'x' },
        slug: 'taken',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('blocks publish without PUBLISH_ARTICLES', async () => {
    queryService.findByIdOrThrow.mockResolvedValue({
      id: 'a-1',
      authorId: 'user-1',
      status: ArticleStatus.DRAFT,
    } as Article);
    await expect(service.publish(actor(), 'a-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('allows publish with the permission and stamps publishedAt', async () => {
    queryService.findByIdOrThrow.mockResolvedValue({
      id: 'a-1',
      authorId: 'user-1',
      status: ArticleStatus.DRAFT,
      publishedAt: null,
    } as Article);
    const result = await service.publish(
      actor({ permissionCodes: [PermissionKey.PUBLISH_ARTICLES] }),
      'a-1',
    );
    expect(result.status).toBe(ArticleStatus.PUBLISHED);
    expect(result.publishedAt).toBeInstanceOf(Date);
  });
});
