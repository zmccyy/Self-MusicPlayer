import type { NextFunction, Request, Response } from 'express';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

/** Thrown when importing a file whose content hash already exists in the library. */
export class DuplicateImportError extends Error {
  constructor(message = 'duplicate file already in library') {
    super(message);
  }
}

export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Not found' });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: unknown): void {
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: err.message, details: err.details });
    return;
  }
  console.error('[server] Unhandled error:', err);
  const message = err instanceof Error ? err.message : String(err);
  res.status(500).json({ error: message });
}
