const assert = require('node:assert/strict');
const test = require('node:test');

const {
  applyLessonProgressEvent,
  createLessonTelemetryEvent,
  mergeLessonProgressRecords,
  normalizeLessonProgressRecord
} = require('../assets/lesson-progress-domain');

test('lesson progress domain stores metadata-only lesson refs and redacts lesson body content', () => {
  const record = normalizeLessonProgressRecord({
    setId: 'vocabulary-homophones',
    grade: '4',
    status: 'completed',
    version: '2',
    contentHash: 'sha256:lesson',
    sourceRoute: '/topics/vocabulary/subtopics/homophones.html?student=secret',
    source: 'study_aid',
    completedAt: '2030-04-29T12:05:00.000Z',
    storyBeats: [{ narrative: 'Do not store story text' }],
    examples: [{ text: 'Do not store examples' }],
    guidedChecks: [{ answer: 'Do not store answers' }]
  });

  assert.deepEqual(record.lessonRef, {
    setId: 'vocabulary-homophones',
    grade: 4,
    version: 2,
    contentHash: 'sha256:lesson'
  });
  assert.equal(record.status, 'completed');
  assert.equal(record.sourceRoute, '/topics/vocabulary/subtopics/homophones.html');
  assert.equal(record.openedFromStudyAid, true);
  assert.equal(JSON.stringify(record).includes('Do not store'), false);
});

test('lesson progress domain applies lifecycle events deterministically', () => {
  const started = applyLessonProgressEvent(null, {
    type: 'lesson_started',
    setId: 'grammar-sentence-types',
    grade: 5,
    sourceRoute: '/topics/grammar/subtopics/sentence-types.html?learn=1'
  }, { now: () => '2030-04-29T12:00:00.000Z' });

  const resumed = applyLessonProgressEvent(started, {
    type: 'lesson_resumed',
    setId: 'grammar-sentence-types',
    grade: 5
  }, { now: () => '2030-04-29T12:03:00.000Z' });

  const completed = applyLessonProgressEvent(resumed, {
    type: 'lesson_completed',
    setId: 'grammar-sentence-types',
    grade: 5,
    version: 1,
    contentHash: 'sha256:story'
  }, { now: () => '2030-04-29T12:06:00.000Z' });

  assert.equal(started.status, 'in_progress');
  assert.equal(resumed.resumedAt, '2030-04-29T12:03:00.000Z');
  assert.equal(completed.status, 'completed');
  assert.equal(completed.completedAt, '2030-04-29T12:06:00.000Z');
  assert.equal(completed.lessonRef.contentHash, 'sha256:story');
});

test('lesson progress domain merges duplicate records without reviving stale incomplete status', () => {
  const merged = mergeLessonProgressRecords([
    { setId: 'grammar-sentence-types', grade: 4, status: 'in_progress', updatedAt: '2030-04-29T12:01:00.000Z' },
    { setId: 'grammar-sentence-types', grade: 4, status: 'completed', completedAt: '2030-04-29T12:02:00.000Z', updatedAt: '2030-04-29T12:02:00.000Z' },
    { setId: '', grade: 4, status: 'completed' }
  ]);

  assert.equal(merged.length, 1);
  assert.equal(merged[0].status, 'completed');
});

test('lesson progress telemetry event is metadata-only and route-query safe', () => {
  const event = createLessonTelemetryEvent({
    type: 'lesson_opened_from_study_aid',
    setId: 'reading-comprehension-inference',
    grade: 4,
    version: 1,
    contentHash: 'sha256:lesson',
    sourceRoute: '/reports.html?learnerId=secret',
    question: 'Raw prompt',
    storyBeats: [{ narrative: 'Raw lesson text' }]
  }, { now: () => '2030-04-29T12:00:00.000Z' });

  assert.equal(event.type, 'lesson_opened_from_study_aid');
  assert.equal(event.route, '/reports.html');
  assert.deepEqual(event.lesson, {
    setId: 'reading-comprehension-inference',
    grade: 4,
    status: 'in_progress',
    version: 1,
    contentHash: 'sha256:lesson',
    source: 'study_aid',
    openedFromStudyAid: true
  });
  assert.equal(JSON.stringify(event).includes('Raw'), false);
});

test('lesson progress records can support mission readiness without lesson bodies', () => {
  const merged = mergeLessonProgressRecords([
    {
      setId: 'grammar-sentence-types',
      grade: 5,
      status: 'in_progress',
      updatedAt: '2030-04-29T11:00:00.000Z',
      storyBeats: [{ text: 'Raw lesson body' }]
    },
    {
      setId: 'grammar-sentence-types',
      grade: 5,
      status: 'completed',
      completedAt: '2030-04-29T11:05:00.000Z',
      updatedAt: '2030-04-29T11:05:00.000Z'
    }
  ]);

  assert.equal(merged[0].lessonRef.setId, 'grammar-sentence-types');
  assert.equal(merged[0].status, 'completed');
  assert.equal(merged[0].completedAt, '2030-04-29T11:05:00.000Z');
  assert.equal(JSON.stringify(merged).includes('Raw lesson body'), false);
});
