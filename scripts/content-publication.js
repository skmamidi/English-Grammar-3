#!/usr/bin/env node

const crypto = require('node:crypto');
const publicationDomain = require('../assets/content-publication-domain');
const { aggregatePublicationQa } = require('./qa/content-publication-qa');

async function runContentPublicationCommand(command, options = {}) {
  const now = typeof options.now === 'function' ? options.now : () => new Date().toISOString();
  if (command === 'plan') {
    return publicationDomain.createPublication({
      id: options.id || `pub-${hash((options.changedFiles || []).join('|')).slice(0, 12)}`,
      status: 'draft',
      sourceHash: options.sourceHash || `sha256:${hash((options.changedFiles || []).join('|'))}`,
      artifactHash: options.artifactHash || `sha256:${hash('artifact:' + (options.changedFiles || []).join('|'))}`,
      changedFiles: options.changedFiles || [],
      qaResults: options.qaResults || [{ id: 'plan', status: 'passed' }],
      createdAt: now(),
      updatedAt: now()
    });
  }
  if (command === 'qa') {
    return aggregatePublicationQa(options);
  }
  if (command === 'approve') {
    const actor = options.actor || {};
    if (actor.role !== 'content_reviewer') throw new Error('publication_requires_content_reviewer');
    return publicationDomain.approvePublication(options.publication, {
      actorId: actor.id,
      role: actor.role,
      approvedAt: now()
    });
  }
  if (command === 'publish') {
    return publicationDomain.publishPublication(options.publication, {
      actorId: options.actor && options.actor.id,
      publishedAt: now()
    });
  }
  throw new Error(`unknown_content_publication_command:${command}`);
}

function hash(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

if (require.main === module) {
  runContentPublicationCommand(process.argv[2] || 'plan', { changedFiles: process.argv.slice(3) })
    .then(result => console.log(JSON.stringify(result, null, 2)))
    .catch(error => {
      console.error(error.message);
      process.exit(1);
    });
}

module.exports = {
  runContentPublicationCommand
};
