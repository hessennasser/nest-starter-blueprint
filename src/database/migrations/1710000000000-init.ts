import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial schema. In this codebase migrations are ALWAYS hand-reviewed even
 * when generated (`pnpm migration:generate --name=x`): `synchronize` is off in
 * every environment. One migration per logical change; never edit a migration
 * that has run anywhere.
 */
export class Init1710000000000 implements MigrationInterface {
  name = 'Init1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    await queryRunner.query(
      `CREATE TYPE "users_user_type_enum" AS ENUM('SUPER_ADMIN', 'ADMIN', 'USER')`,
    );
    await queryRunner.query(
      `CREATE TYPE "users_status_enum" AS ENUM('ACTIVE', 'DISABLED', 'PENDING')`,
    );
    await queryRunner.query(
      `CREATE TYPE "roles_scope_type_enum" AS ENUM('ADMIN', 'USER')`,
    );
    await queryRunner.query(
      `CREATE TYPE "articles_status_enum" AS ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED')`,
    );

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "email" varchar(320) NOT NULL,
        "password" varchar(255) NOT NULL,
        "full_name" varchar(255) NOT NULL,
        "phone_number" varchar(32),
        "avatar" varchar(500),
        "user_type" "users_user_type_enum" NOT NULL DEFAULT 'USER',
        "status" "users_status_enum" NOT NULL DEFAULT 'PENDING',
        "last_login_at" timestamptz,
        "email_verified_at" timestamptz,
        "disabled_at" timestamptz,
        "deleted_at" timestamptz,
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "permissions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "code" varchar(120) NOT NULL,
        "type" varchar(30) NOT NULL DEFAULT 'ADMIN',
        "name" jsonb NOT NULL,
        "description" jsonb,
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_permissions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_permissions_code" UNIQUE ("code")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "code" varchar(120) NOT NULL,
        "scope_type" "roles_scope_type_enum" NOT NULL DEFAULT 'ADMIN',
        "name" jsonb NOT NULL,
        "description" jsonb,
        "is_system" boolean NOT NULL DEFAULT false,
        "is_active" boolean NOT NULL DEFAULT true,
        "deletedAt" timestamptz,
        CONSTRAINT "PK_roles" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_roles_code" UNIQUE ("code")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "role_permissions" (
        "rolesId" uuid NOT NULL,
        "permissionsId" uuid NOT NULL,
        CONSTRAINT "PK_role_permissions" PRIMARY KEY ("rolesId", "permissionsId"),
        CONSTRAINT "FK_role_permissions_role" FOREIGN KEY ("rolesId")
          REFERENCES "roles"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_role_permissions_permission" FOREIGN KEY ("permissionsId")
          REFERENCES "permissions"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_role_permissions_role" ON "role_permissions" ("rolesId")`,
    );

    await queryRunner.query(`
      CREATE TABLE "user_roles" (
        "usersId" uuid NOT NULL,
        "rolesId" uuid NOT NULL,
        CONSTRAINT "PK_user_roles" PRIMARY KEY ("usersId", "rolesId"),
        CONSTRAINT "FK_user_roles_user" FOREIGN KEY ("usersId")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_roles_role" FOREIGN KEY ("rolesId")
          REFERENCES "roles"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_user_roles_user" ON "user_roles" ("usersId")`,
    );

    await queryRunner.query(`
      CREATE TABLE "refresh_sessions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "user_id" uuid NOT NULL,
        "token_hash" varchar(64) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "revoked_at" timestamptz,
        "ip_address" varchar(64),
        "user_agent" varchar(255),
        CONSTRAINT "PK_refresh_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_refresh_sessions_token_hash" UNIQUE ("token_hash"),
        CONSTRAINT "FK_refresh_sessions_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "articles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "title" jsonb NOT NULL,
        "body" jsonb NOT NULL,
        "slug" varchar(160) NOT NULL,
        "status" "articles_status_enum" NOT NULL DEFAULT 'DRAFT',
        "author_id" uuid NOT NULL,
        "published_at" timestamptz,
        "view_count" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_articles" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_articles_slug" UNIQUE ("slug"),
        CONSTRAINT "FK_articles_author" FOREIGN KEY ("author_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_articles_status" ON "articles" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "articles"`);
    await queryRunner.query(`DROP TABLE "refresh_sessions"`);
    await queryRunner.query(`DROP TABLE "user_roles"`);
    await queryRunner.query(`DROP TABLE "role_permissions"`);
    await queryRunner.query(`DROP TABLE "roles"`);
    await queryRunner.query(`DROP TABLE "permissions"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "articles_status_enum"`);
    await queryRunner.query(`DROP TYPE "roles_scope_type_enum"`);
    await queryRunner.query(`DROP TYPE "users_status_enum"`);
    await queryRunner.query(`DROP TYPE "users_user_type_enum"`);
  }
}
