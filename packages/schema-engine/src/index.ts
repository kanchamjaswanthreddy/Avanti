// @avanti/schema-engine — Schema Migration Engine
// Exports the DDL executor, canvas diff algorithm, meta-schema helpers, and seed.

export { executeSchemaChanges } from './executor';
export { computeDiff, metaSchemaToNodes } from './diff';
export { getMetaSchema, readMetaSchema, writeMetaSchema } from './meta';
export { buildCoreMetaSchema, CORE_TABLE_IDS } from './seed';
