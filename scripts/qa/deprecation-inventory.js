#!/usr/bin/env node

const path = require('node:path');

const {
  DEPRECATION_INVENTORY,
  summarizeDeprecationInventory,
  validateDeprecationInventory
} = require('../../assets/deprecation-inventory');

const repoRoot = path.resolve(__dirname, '..', '..');
const result = validateDeprecationInventory(DEPRECATION_INVENTORY, { root: repoRoot });
const summary = summarizeDeprecationInventory(DEPRECATION_INVENTORY);

console.log(JSON.stringify({
  ok: result.ok,
  summary,
  errors: result.errors,
  items: DEPRECATION_INVENTORY.map(item => ({
    id: item.id,
    type: item.type,
    status: item.status,
    owner: item.owner,
    reviewDate: item.reviewDate,
    riskLevel: item.riskLevel
  }))
}, null, 2));

if (!result.ok) process.exitCode = 1;
