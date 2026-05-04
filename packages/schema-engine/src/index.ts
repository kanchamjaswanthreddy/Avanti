// @avanti/schema-engine — Schema Migration Engine
// Exports the DDL executor, canvas diff algorithm, and meta-schema helpers.

export { executeSchemaChanges } from './executor';
export { computeDiff, metaSchemaToNodes } from './diff';
export { getMetaSchema, readMetaSchema, writeMetaSchema } from './meta';
