/** Application-wide constants. */

/** Display name shown in the sidebar header and browser title. */
export const APP_NAME = 'Admin Dashboard';

/** Default page title suffix appended to every page's <title> tag. */
export const APP_TITLE_SUFFIX = ` | ${APP_NAME}`;

/** Pagination: default number of rows per page. */
export const DEFAULT_PAGE_SIZE = 20;

/** Supported page-size options for data tables. */
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

/** Date-time format used throughout the UI (date-fns compatible). */
export const DATETIME_FORMAT = 'MMM d, yyyy HH:mm';

/** Date-only format. */
export const DATE_FORMAT = 'MMM d, yyyy';

/** Route paths – single source of truth for navigation. */
export const ROUTES = {
  HOME: '/',
  NOT_FOUND: '*',
} as const;
