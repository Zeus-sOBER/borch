-- Migration: Add missing Heisman watch columns
-- This allows existing deployments to add columns without recreating the table

ALTER TABLE heisman_watch ADD COLUMN IF NOT EXISTS trend TEXT DEFAULT 'same';
ALTER TABLE heisman_watch ADD COLUMN IF NOT EXISTS class_year TEXT;
