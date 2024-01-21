import json from '@rollup/plugin-json'
import commonjs from '@rollup/plugin-commonjs'
import { terser } from 'rollup-plugin-terser'
import resolve from '@rollup/plugin-node-resolve'

export default [
  {
    input: './dist/src/index.js',
    output: [
      {
        name: 'Terms',
        format: 'iife',
        file: './dist/bundle.min.cjs',
      },
    ],
    plugins: [
      commonjs({
        transformMixedEsModules: true,
      }),
      resolve({
        preferBuiltins: true,
        browser: true,
      }),
      terser(),
      json(),
    ],
  },
]
