// Types for sync-keycloak-theme.mjs, for the theme drift test.

/** The Keycloak sign-in theme's resources folder. */
export const themeResources: string;

/** The brand `:root` block of the ui package's styles.css. */
export function brandBlock(styles: string): string;

/** Every theme file the script owns: [path inside the resources folder, contents]. */
export function expectedFiles(): Promise<[string, string | Buffer][]>;
