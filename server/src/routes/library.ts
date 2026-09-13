import fsp from 'node:fs/promises';
import path from 'node:path';
import { Router } from 'express';
import { ApiError, asyncHandler, DuplicateImportError } from '../lib/http.js';
import { importFile } from './tracks.js';
import { isSupportedAudioFile } from '../services/metadata.js';

export interface ScanResult {
  added: number;
  skipped: number;
  failed: number;
  errors: { fileName: string; error: string }[];
}

async function collectAudioFiles(dir: string, out: string[], depth = 0): Promise<void> {
  if (depth > 10) return;
  let entries;
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectAudioFiles(fullPath, out, depth + 1);
    } else if (entry.isFile() && isSupportedAudioFile(entry.name)) {
      out.push(fullPath);
    }
  }
}

export const libraryRouter = Router();

libraryRouter.post(
  '/scan',
  asyncHandler(async (req, res) => {
    const dirPath = typeof req.body?.path === 'string' ? req.body.path.trim() : '';
    if (!dirPath) throw new ApiError(400, 'path is required');
    const stat = await fsp.stat(dirPath).catch(() => null);
    if (!stat || !stat.isDirectory()) {
      throw new ApiError(400, `目录不存在或不可访问: ${dirPath}`);
    }

    const files: string[] = [];
    await collectAudioFiles(dirPath, files);

    const result: ScanResult = { added: 0, skipped: 0, failed: 0, errors: [] };
    for (const filePath of files) {
      try {
        await importFile(filePath, path.basename(filePath));
        result.added += 1;
      } catch (err) {
        if (err instanceof DuplicateImportError) {
          result.skipped += 1;
        } else {
          result.failed += 1;
          result.errors.push({
            fileName: path.basename(filePath),
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    res.json({ scanned: files.length, ...result });
  }),
);
