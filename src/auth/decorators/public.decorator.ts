import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
/**
 * Decorator that marks a controller or handler method as public, bypassing authentication.
 * When applied, it sets the 'isPublic' metadata key to true, which can be used by
 * guards to determine whether authentication should be skipped.
 *
 * @example
 * ```typescript
 * @Public()
 * @Get('public-endpoint')
 * publicEndpoint() {
 *   return 'This endpoint is accessible without authentication';
 * }
 * ```
 *
 * @returns A decorator function that sets the metadata
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
