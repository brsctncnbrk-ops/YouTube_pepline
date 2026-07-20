import path from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import {
  SCHEMAS_DIR,
  pathExists,
  readJson,
} from "./fs-utils.mjs";

const compiled = new Map();

export async function compileSchema(schemaName) {
  if (compiled.has(schemaName)) return compiled.get(schemaName);
  const schemaPath = path.join(SCHEMAS_DIR, `${schemaName}.schema.json`);
  if (!(await pathExists(schemaPath))) {
    const error = new Error(`Unknown schema ${schemaName}: ${schemaPath}`);
    error.code = "SCHEMA_VALIDATION_FAILED";
    throw error;
  }
  const schema = await readJson(schemaPath);
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validator = ajv.compile(schema);
  compiled.set(schemaName, validator);
  return validator;
}

export async function validateJsonValue({ value, schemaName }) {
  const validator = await compileSchema(schemaName);
  const valid = validator(value);
  return {
    valid: Boolean(valid),
    error_code: valid ? null : "SCHEMA_VALIDATION_FAILED",
    errors: valid
      ? []
      : (validator.errors || []).map((entry) =>
          `${entry.instancePath || "/"} ${entry.message}`,
        ),
  };
}

export async function validateJsonFile({ file, schemaName }) {
  if (!(await pathExists(file))) {
    return {
      valid: false,
      error_code: "SCHEMA_VALIDATION_FAILED",
      errors: [`File not found: ${file}`],
    };
  }
  try {
    return validateJsonValue({ value: await readJson(file), schemaName });
  } catch (error) {
    if (error?.code === "SCHEMA_VALIDATION_FAILED") throw error;
    return {
      valid: false,
      error_code: "INVALID_JSON",
      errors: [error.message],
    };
  }
}
