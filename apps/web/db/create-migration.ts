import * as path from "path";
import { fileURLToPath } from "url";
import { promises as fs } from "fs";

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationsFolder = path.join(__dirname, "migrations");

async function createMigration() {
  const migrationName = process.argv[2];

  if (!migrationName) {
    console.error("Usage: npm run migrate:create <migration-name>");
    console.error("Example: npm run migrate:create add_users_table");
    process.exit(1);
  }

  // Generate timestamp: YYYYMMDDHHMMSS
  const now = new Date();
  const timestamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join("");

  const fileName = `${timestamp}_${migrationName}.ts`;
  const filePath = path.join(migrationsFolder, fileName);

  // Ensure migrations folder exists
  await fs.mkdir(migrationsFolder, { recursive: true });

  // Check if file already exists
  try {
    await fs.access(filePath);
    console.error(`Migration file ${fileName} already exists!`);
    process.exit(1);
  } catch {
    // File doesn't exist, which is what we want
  }

  const template = `import { Kysely } from 'kysely'

export async function up(db: Kysely<any>): Promise<void> {
  // Migration up logic here
}

export async function down(db: Kysely<any>): Promise<void> {
  // Migration down logic here
}
`;

  await fs.writeFile(filePath, template, "utf-8");
  console.log(`Created migration: ${fileName}`);
}

createMigration().catch((error) => {
  console.error("Failed to create migration:", error);
  process.exit(1);
});
