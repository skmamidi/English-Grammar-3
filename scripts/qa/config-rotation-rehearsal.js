#!/usr/bin/env node

const {
  CONFIG_ROTATION_REHEARSALS,
  buildRotationRehearsalSummary,
  validateRotationRehearsals
} = require('../../assets/config-rotation-rehearsal-policy');

const validation = validateRotationRehearsals(CONFIG_ROTATION_REHEARSALS);

console.log(JSON.stringify({
  ok: validation.ok,
  summary: buildRotationRehearsalSummary(CONFIG_ROTATION_REHEARSALS),
  errors: validation.errors,
  rehearsals: CONFIG_ROTATION_REHEARSALS.map(item => ({
    id: item.id,
    configType: item.configType,
    owner: item.owner,
    verification: item.verification
  }))
}, null, 2));

if (!validation.ok) process.exitCode = 1;
