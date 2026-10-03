import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canTransition, capabilities, EVENT_STATUSES } from '../../src/features/event/state-machine';

test('stati: il flusso normale è consentito', () => {
  assert.ok(canTransition('SETUP', 'CREATION_OPEN'));
  assert.ok(canTransition('CREATION_OPEN', 'VOTING_OPEN'));
  assert.ok(canTransition('VOTING_OPEN', 'VOTING_CLOSED'));
  assert.ok(canTransition('VOTING_CLOSED', 'RESULTS_REVEALED'));
});

test('stati: non si salta al verdetto dalla preparazione', () => {
  assert.equal(canTransition('SETUP', 'RESULTS_REVEALED'), false);
  assert.equal(canTransition('CREATION_OPEN', 'RESULTS_REVEALED'), false);
});

test('capacità: si vota solo a votazioni aperte, risultati solo dopo il reveal', () => {
  for (const s of EVENT_STATUSES) {
    const caps = capabilities(s);
    assert.equal(caps.canVote, s === 'VOTING_OPEN');
    assert.equal(caps.resultsVisible, s === 'RESULTS_REVEALED');
    assert.equal(caps.canCreatePizza, s === 'CREATION_OPEN');
  }
});
