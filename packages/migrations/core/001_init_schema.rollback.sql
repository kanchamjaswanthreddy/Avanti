-- Rollback for migration 001_init_schema.sql
-- Run this to undo the initial schema creation.

DROP TABLE IF EXISTS subscriptions;
DROP TABLE IF EXISTS provision_log;
DROP TABLE IF EXISTS schools;
DROP TABLE IF EXISTS _migration_history;
