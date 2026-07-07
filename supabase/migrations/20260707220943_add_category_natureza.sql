ALTER TABLE "public"."categories" ADD COLUMN "natureza" text;

UPDATE "public"."categories"
SET "natureza" = 'Despesa Variável'
WHERE "type" = 'Saida' AND "natureza" IS NULL;
