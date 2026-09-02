# Recipe: add a feature module

Worked example: a `comments` module (comments on articles). Every step mirrors
the shipped [`articles`](../src/modules/articles) module — keep that open beside
this.

Estimated: ~10 files, 30 minutes. Steps 1–9 are the module; step 10 wires it in.

---

## 0. Scaffold

```
src/modules/comments/
├── comments.module.ts
├── comments.controller.ts
├── comments.service.ts
├── comments.presenter.ts
├── services/comments-query.service.ts
├── policies/comment-policy.service.ts
├── dto/
│   ├── create-comment.dto.ts
│   ├── update-comment.dto.ts
│   ├── list-comments-query.dto.ts
│   ├── comment-response.dto.ts
│   └── index.ts
├── entities/comment.entity.ts
└── tests/comments.service.spec.ts
```

(Skip `services/` and `policies/` for a truly trivial CRUD — but you almost
always want the policy.)

---

## 1. Entity

`entities/comment.entity.ts` — extend the base, `snake_case` columns, index what
you filter on:

```ts
@Entity({ name: 'comments' })
@Index(['articleId'])
export class Comment extends EntityRelationalHelper {
  @Column({ type: 'text' })
  body: string;                                   // not user-facing localized → plain text ok

  @Column({ type: 'uuid', name: 'article_id' })
  articleId: string;

  @ManyToOne(() => Article, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'article_id' })
  article?: Article;

  @Column({ type: 'uuid', name: 'author_id' })
  authorId: string;
}
```

## 2. Permission keys

Add to `src/shared/constants/permission-keys.ts`:

```ts
MANAGE_COMMENTS = 'MANAGE_COMMENTS',
MODERATE_COMMENTS = 'MODERATE_COMMENTS',
```

Wire them onto roles in `src/database/seeds/seed-rbac.ts` (`PERMISSIONS` map +
the relevant `ROLES[...].permissions`).

## 3. Migration

```bash
pnpm migration:generate --name=add_comments
```

**Read the generated file.** Confirm the enum names, FK `ON DELETE`, and indexes
match the entity. Then `pnpm migration:run`.

## 4. DTOs

- `create-comment.dto.ts` — `class-validator` rules, `@ApiProperty`, and
  `@Trim...`/`@TransformTo...` from `transform.helper.ts` for any non-JSON body.
- `update-comment.dto.ts` — `extends PartialType(CreateCommentDto)`.
- `list-comments-query.dto.ts` — `extends PaginationQueryDto`, add `articleId`,
  `search`, filters.
- `comment-response.dto.ts` — `CommentDto` + `PaginatedCommentsDto`
  (`items` + `meta` [+ `statusCounts`]).
- `dto/index.ts` re-exports all four.

## 5. Presenter

`comments.presenter.ts` — **pure functions**, no class:

```ts
export const presentComment = (c: Comment): CommentDto => ({
  id: c.id, body: c.body, articleId: c.articleId,
  authorId: c.authorId, createdAt: c.createdAt,
});

export const presentCommentsPage = (page: PaginatedResponse<Comment>) => ({
  items: page.items.map(presentComment),
  meta: page.meta,
});
```

## 6. Query sub-service

`services/comments-query.service.ts` — owns reads:

```ts
async list(query: ListCommentsQueryDto): Promise<PaginatedResponse<Comment>> {
  const qb = this.comments.createQueryBuilder('comment')
    .orderBy('comment.createdAt', query.order === 'ASC' ? 'ASC' : 'DESC');
  if (query.articleId) qb.andWhere('comment.articleId = :id', { id: query.articleId });
  if (query.search)    qb.andWhere('comment.body ILIKE :q', { q: `%${query.search}%` });
  return paginateQuery(qb, query);
}

async findByIdOrThrow(id: string): Promise<Comment> {
  const c = await this.comments.findOne({ where: { id } });
  if (!c) throw new NotFoundException('Comment not found');   // → add errors.comment_not_found
  return c;
}
```

## 7. Policy

`policies/comment-policy.service.ts` — "may they?", throws:

```ts
assertCanEdit(user: AuthenticatedUser, comment: Comment): void {
  if (user.userType === UserType.SUPER_ADMIN) return;
  if (user.permissionCodes.includes(PermissionKey.MODERATE_COMMENTS)) return;
  if (comment.authorId === user.id) return;
  throw new ForbiddenException('You cannot edit this comment');
}
```

## 8. Facade service

`comments.service.ts` — the only class the controller sees. Write path here,
reads delegated, authz delegated:

```ts
list(q) { return this.queryService.list(q); }
getById(id) { return this.queryService.findByIdOrThrow(id); }

async create(actor: AuthenticatedUser, dto: CreateCommentDto) {
  return this.comments.save(this.comments.create({ ...dto, authorId: actor.id }));
}

async update(actor: AuthenticatedUser, id: string, dto: UpdateCommentDto) {
  const comment = await this.queryService.findByIdOrThrow(id);
  this.policy.assertCanEdit(actor, comment);
  Object.assign(comment, dto);
  return this.comments.save(comment);
}
```

## 9. Controller

`comments.controller.ts` — declarative only:

```ts
@Controller('comments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiTags('Comments')
@ApiBearerAuth('access-token')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  @RequireAnyPermissions(PermissionKey.MANAGE_COMMENTS, PermissionKey.MODERATE_COMMENTS)
  async list(@Query() query: ListCommentsQueryDto) {
    return ResponseHelper.paginated(
      presentCommentsPage(await this.commentsService.list(query)),
    );
  }

  @Post()
  @RequirePermissions(PermissionKey.MANAGE_COMMENTS)
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCommentDto) {
    return ResponseHelper.created(presentComment(await this.commentsService.create(user, dto)));
  }
  // ...patch/:id, delete/:id — same shape
}
```

## 10. Module + registration

`comments.module.ts`:

```ts
@Module({
  imports: [TypeOrmModule.forFeature([Comment])],
  controllers: [CommentsController],
  providers: [CommentsService, CommentsQueryService, CommentPolicyService],
  exports: [CommentsService],
})
export class CommentsModule {}
```

Add `CommentsModule` to the `imports` array in `src/app.module.ts` (the
`// Feature modules` section).

## 11. Tests + i18n

- `tests/comments.service.spec.ts` — mock the repo + query service, assert the
  policy blocks a non-author, assert the happy path. Copy
  `articles.service.spec.ts`.
- Add every new English literal you threw (`'Comment not found'`, …) to
  `src/i18n/en/errors.json` + `src/i18n/ar/errors.json` and map it in
  `src/shared/i18n/api-message-localizer.ts` (`ERROR_MESSAGE_KEYS`).

## Checklist

- [ ] entity extends `EntityRelationalHelper`, columns `snake_case`, indexes on filter columns
- [ ] permission keys added + seeded onto roles
- [ ] migration generated **and read** + run
- [ ] DTOs: validation + `@ApiProperty` + transform decorators; `update` = `PartialType`
- [ ] presenter is pure functions
- [ ] reads in the query service, "can they?" in the policy, orchestration in the facade
- [ ] controller has no `if` — guards + one service call + one `ResponseHelper`
- [ ] module `exports` only the facade
- [ ] module added to `app.module.ts`
- [ ] spec covers authz + happy path; new literals translated
