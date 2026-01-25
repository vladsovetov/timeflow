import { generateOpenApiDocument } from "@acme/api";
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, "..", "openapi.json");
const doc = generateOpenApiDocument();
writeFileSync(outPath, JSON.stringify(doc, null, 2));
console.log("Wrote", outPath);
