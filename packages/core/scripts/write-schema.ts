/**
 * Writes the document's JSON Schema from the zod schemas, the source of
 * truth. Run after changing them: `bun run schema`. A test fails when the
 * committed file is out of date.
 */
import { writeFileSync } from "node:fs";
import { documentJsonSchema } from "../src/document";

const file = new URL("../schema/document.v1.json", import.meta.url);
writeFileSync(file, `${JSON.stringify(documentJsonSchema(), null, "\t")}\n`);
console.log(`Wrote ${file.pathname}`);
