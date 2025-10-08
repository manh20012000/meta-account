import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1759502903002 implements MigrationInterface {
    name = 'Init1759502903002'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "user"."users" ("_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying(150), "phone" character varying(150), "countryCode" character varying(150), "password" character varying(120) NOT NULL, "firstName" character varying(80), "lastName" character varying(80), "name" character varying(160), "birthday" date, "gender" character varying(10) NOT NULL DEFAULT 'unknown', "avatar" text, "isVerified" boolean NOT NULL DEFAULT false, "role" character varying(20) NOT NULL DEFAULT 'user', "friends" text array NOT NULL DEFAULT ARRAY[]::text[], "requests" text array NOT NULL DEFAULT ARRAY[]::text[], "likeCount" integer NOT NULL DEFAULT '0', "status" character varying(20) NOT NULL DEFAULT 'active', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_46c438e5a956fb9c3e86e73e321" PRIMARY KEY ("_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_3676155292d72c67cd4e090514" ON "user"."users" ("status") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "user"."IDX_3676155292d72c67cd4e090514"`);
        await queryRunner.query(`DROP TABLE "user"."users"`);
    }

}
