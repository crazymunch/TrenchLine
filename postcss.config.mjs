/**
 * Named, then exported.
 *
 * `import/no-anonymous-default-export` is not pedantry on a config file: a
 * default export with no name shows up in a stack trace and a tooling error as
 * "default", which is what it is called in every other config too.
 */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
