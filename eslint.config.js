import antfu from '@antfu/eslint-config'

export default antfu({
  typescript: true,
  vue: true,
  rules: {
    'unused-imports/no-unused-vars': ['warn'],
    'no-console': ['warn'],
    'vue/no-reserved-component-names': ['warn'],
    'node/prefer-global/process': ['warn'],
    'vue/block-order': ['warn', {
      order: [['script', 'template'], 'style'],
    }],
    'ts/no-explicit-any': ['off'],
  },
}, {
  ignores: [
    '**/*.md',
    '**/*.js',
    '*.js',
  ],
})
