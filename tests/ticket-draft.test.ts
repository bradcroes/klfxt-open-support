import { test } from 'node:test';
import assert from 'node:assert/strict';
import { propertyPatch, receivePropertyDraft } from '../web/ticket-draft';
import type { Ticket } from '../web/types';

const original: Ticket = {
  id: 'request-1',
  reference: 'OS-example',
  name: 'Customer',
  email: 'customer@example.com',
  subject: 'A support question',
  status: 'open',
  priority: 'normal',
  assignee: 'Original owner',
  created_at: '2026-11-02T12:00:00Z',
  updated_at: '2026-11-02T12:00:00Z',
  version: 1,
  booking_url: '',
  payment_url: '',
};

test('refreshing another owner’s changes never rebases a preserved property draft', () => {
  const draft = receivePropertyDraft(null, original);
  draft.values.status = 'resolved';
  const otherOwner = {
    ...original,
    version: 2,
    priority: 'urgent' as const,
    assignee: 'Other owner',
  };
  const refreshed = receivePropertyDraft(draft, otherOwner);
  const update = propertyPatch(refreshed);
  assert.equal(
    update.version,
    1,
    'the server must receive the version that the edited fields were based on',
  );
  assert.equal(update.status, 'resolved');
  assert.equal(update.assignee, 'Original owner');
});

test('posting a reply cannot silently rebase a property draft when the message bumps the ticket version', () => {
  const draft = receivePropertyDraft(null, original);
  draft.values.assignee = 'Unsaved assignment';
  const afterReply = receivePropertyDraft(draft, { ...original, version: 2 });
  assert.equal(propertyPatch(afterReply).version, 1);
  assert.equal(afterReply.values.assignee, 'Unsaved assignment');
  assert.notEqual(
    afterReply.baseVersion,
    2,
    'the property form must remain stale until an intentional reload',
  );
});

test('an explicit discard and reload adopts the latest property snapshot and its matching version', () => {
  const draft = receivePropertyDraft(null, original);
  draft.values.status = 'resolved';
  const latest = { ...original, version: 3, status: 'waiting' as const, assignee: 'Other owner' };
  const reloaded = receivePropertyDraft(draft, latest, true);
  assert.equal(propertyPatch(reloaded).version, 3);
  assert.equal(reloaded.values.status, 'waiting');
  assert.equal(reloaded.values.assignee, 'Other owner');
});
