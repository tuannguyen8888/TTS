import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

export type RequestWithContext = Request & {
  requestId?: string;
};

export function requestContextMiddleware(
  req: RequestWithContext,
  res: Response,
  next: NextFunction,
) {
  const incoming = req.headers['x-request-id'];
  const requestId =
    typeof incoming === 'string' && incoming.trim().length > 0
      ? incoming.trim()
      : randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}

