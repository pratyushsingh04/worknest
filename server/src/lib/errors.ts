export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const badRequest = (msg: string) => new HttpError(400, msg);
export const unauthorized = (msg = 'Not signed in') => new HttpError(401, msg);
export const forbidden = (msg = 'You do not have access to this') => new HttpError(403, msg);
export const notFound = (msg = 'Not found') => new HttpError(404, msg);
export const conflict = (msg: string) => new HttpError(409, msg);
export const gone = (msg: string) => new HttpError(410, msg);
export const tooManyRequests = (retryAfterSec: number) =>
  new HttpError(429, `Too many attempts. Try again in ${Math.max(1, Math.ceil(retryAfterSec / 60))} minute(s).`);
