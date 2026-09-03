import { NextResponse } from 'next/server';

/**
 * One shape for every API failure.
 *
 * The routes each invented their own: some returned `{ error: 'Failed to
 * fetch campaign' }` with a 500 for what was really a 400, some returned the
 * caught exception's `message`, and one spread the request body into its
 * response. A client could not tell "you sent something invalid" from "this
 * server is broken", and the ones that echoed `err.message` leaked Prisma's
 * internals — table names, column names, constraint names — to anyone who
 * could provoke a query error.
 *
 * `{ error: string }` is kept as the wire shape because the existing clients
 * read `body.error`. What changes is that the string is always chosen here,
 * never taken from an exception.
 */

export type ApiFailure = { error: string; code: string };

const failure = (status: number, code: string, error: string) =>
  NextResponse.json<ApiFailure>({ error, code }, { status });

/** The request's shape or values are wrong. */
export const badRequest = (error = 'That request was not valid.') =>
  failure(400, 'bad_request', error);

/** No session. The caller may succeed after signing in. */
export const unauthorized = (error = 'Sign in to do that.') =>
  failure(401, 'unauthorized', error);

/**
 * A session, but not the right one. Deliberately identical in body to
 * `notFound` at the call sites that use it for a resource the caller may not
 * see — telling them a campaign exists but is not theirs is a disclosure.
 */
export const forbidden = (error = 'You do not have access to that.') =>
  failure(403, 'forbidden', error);

export const notFound = (error = 'Not found.') =>
  failure(404, 'not_found', error);

export const conflict = (error: string) => failure(409, 'conflict', error);

export const payloadTooLarge = (error = 'That request body is too large.') =>
  failure(413, 'payload_too_large', error);

/**
 * Something went wrong on this side.
 *
 * The exception is logged, never returned. `err.message` from Prisma names
 * tables, columns and constraints, and a caller who can provoke one gets a
 * free description of the schema.
 */
export function serverError(context: string, err: unknown) {
  console.error(`[api] ${context}`, err);
  return failure(500, 'server_error', 'Something went wrong. Try again.');
}

/** A thrown `ApiError` is turned into its response by `handle` below. */
export class ApiError extends Error {
  constructor(readonly response: NextResponse) {
    super('api-error');
  }
}

/** Throw a prepared failure from anywhere inside a handler. */
export const abort = (response: NextResponse): never => {
  throw new ApiError(response);
};

/**
 * Run a handler, turning a thrown `ApiError` into its response and anything
 * else into a logged 500.
 *
 * Every route used to wrap itself in `try/catch (err: any)` and return a 500
 * with a hand-written message, which is why a missing field and a database
 * outage looked the same from outside.
 */
export async function handle(
  context: string,
  fn: () => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ApiError) return err.response;
    return serverError(context, err);
  }
}
