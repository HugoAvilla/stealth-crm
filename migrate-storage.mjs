// Migração de arquivos do Storage entre projetos Supabase.
// As chaves NÃO ficam no arquivo — são lidas de variáveis de ambiente.
//
// Como rodar (PowerShell, dentro de stealth-crm/):
//   $env:OLD_URL         = "https://msdpmhtdjyoqdmjwunkm.supabase.co"
//   $env:OLD_SERVICE_KEY = "<service_role key do projeto ANTIGO>"
//   $env:NEW_URL         = "https://kmcvlvcgjbqtvkasqdbh.supabase.co"
//   $env:NEW_SERVICE_KEY = "<service_role key do WFE_Brasil>"
//   node migrate-storage.mjs
//
import { createClient } from "@supabase/supabase-js";

const { OLD_URL, OLD_SERVICE_KEY, NEW_URL, NEW_SERVICE_KEY } = process.env;

if (!OLD_URL || !OLD_SERVICE_KEY || !NEW_URL || !NEW_SERVICE_KEY) {
  console.error("Faltam variáveis: OLD_URL, OLD_SERVICE_KEY, NEW_URL, NEW_SERVICE_KEY");
  process.exit(1);
}

const old = createClient(OLD_URL, OLD_SERVICE_KEY, { auth: { persistSession: false } });
const neo = createClient(NEW_URL, NEW_SERVICE_KEY, { auth: { persistSession: false } });

// Lista todos os arquivos de um bucket, descendo em subpastas.
async function listAllFiles(client, bucket, prefix = "") {
  const out = [];
  let offset = 0;
  const limit = 100;
  while (true) {
    const { data, error } = await client.storage.from(bucket).list(prefix, {
      limit, offset, sortBy: { column: "name", order: "asc" },
    });
    if (error) throw new Error(`list ${bucket}/${prefix}: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) {
        // é uma "pasta" → desce recursivamente
        out.push(...(await listAllFiles(client, bucket, path)));
      } else {
        out.push(path);
      }
    }
    if (data.length < limit) break;
    offset += limit;
  }
  return out;
}

async function run() {
  const { data: buckets, error: bErr } = await old.storage.listBuckets();
  if (bErr) throw new Error(`listBuckets: ${bErr.message}`);

  let totalOk = 0, totalFail = 0;

  for (const b of buckets) {
    console.log(`\n=== Bucket: ${b.name} (public=${b.public}) ===`);

    // garante que o bucket existe no projeto novo
    const { error: createErr } = await neo.storage.createBucket(b.name, {
      public: b.public,
      fileSizeLimit: b.file_size_limit ?? undefined,
      allowedMimeTypes: b.allowed_mime_types ?? undefined,
    });
    if (createErr && !/already exists/i.test(createErr.message)) {
      console.log(`  aviso ao criar bucket: ${createErr.message}`);
    }

    const files = await listAllFiles(old, b.name);
    console.log(`  ${files.length} arquivo(s) encontrado(s)`);

    for (const path of files) {
      try {
        const { data: blob, error: dErr } = await old.storage.from(b.name).download(path);
        if (dErr) throw dErr;
        const buffer = Buffer.from(await blob.arrayBuffer());
        const { error: uErr } = await neo.storage.from(b.name).upload(path, buffer, {
          upsert: true,
          contentType: blob.type || undefined,
        });
        if (uErr) throw uErr;
        totalOk++;
        console.log(`  ✓ ${path}`);
      } catch (e) {
        totalFail++;
        console.log(`  ✗ ${path} → ${e.message || e}`);
      }
    }
  }

  console.log(`\nConcluído. Copiados: ${totalOk} | Falhas: ${totalFail}`);
  if (totalFail > 0) process.exit(1);
}

run().catch((e) => { console.error(e); process.exit(1); });
