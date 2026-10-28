// @ts-check
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: ['build/', 'node_modules/', 'documentation/'],
    },
    ...tseslint.configs.recommended,
);
