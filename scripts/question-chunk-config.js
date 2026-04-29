const CHUNK_MIGRATION_ORDER = [
  'capitalization',
  'reference-skills',
  'punctuation',
  'vocabulary',
  'reading-comprehension',
  'grammar'
];

const CHUNKED_DOMAINS = new Set(CHUNK_MIGRATION_ORDER);

module.exports = {
  CHUNKED_DOMAINS,
  CHUNK_MIGRATION_ORDER
};
