const assert = require('node:assert/strict');
const test = require('node:test');

const catalog = require('../assets/guided-mission-catalog.json');
const recommendations = require('../assets/mission-recommendation-domain');

const now = '2030-04-29T12:00:00.000Z';

test('mission recommendation policy ranks missions by weak skills review urgency goals and assignments without payloads', () => {
  const result = recommendations.generateMissionRecommendations({
    catalog,
    learnerGrade: 5,
    now,
    goals: {
      focusDomains: ['grammar'],
      focusSkillIds: ['grammar.sentence-analysis'],
      notes: 'Hidden learner wants raw prompt help'
    },
    recentSessions: [{
      learnerId: 'learner-hidden',
      completedAt: '2030-04-28T12:00:00.000Z',
      attempts: [
        missed('grammar.sentence-analysis', 'grammar-sentence-types-q1', 'hard', 5),
        missed('grammar.sentence-analysis', 'grammar-sentence-types-q2', 'hard', 5),
        correct('grammar.sentence-analysis', 'grammar-sentence-types-q3', 'medium', 5),
        correct('capitalization.capitalization', 'capitalization-sentence-beginning-q1', 'easy', 3)
      ]
    }],
    reviewSchedule: [{
      ref: { id: 'grammar-sentence-types-q1', prompt: 'Hidden review prompt' },
      skillIds: ['grammar.sentence-analysis'],
      setId: 'grammar-sentence-types',
      dueAt: '2030-04-28T12:00:00.000Z'
    }],
    assignments: [{
      id: 'assignment-grammar-1',
      status: 'active',
      dueAt: '2030-04-29T10:00:00.000Z',
      accuracy: 0.55,
      learnerName: 'Hidden Learner',
      scope: {
        skillIds: ['grammar.sentence-analysis'],
        setIds: ['grammar-sentence-types']
      }
    }],
    lessonProgress: [
      { setId: 'grammar-subject-predicate', status: 'completed', completedAt: '2030-04-20T12:00:00.000Z' }
    ]
  });

  assert.equal(result.generatedAt, now);
  assert.equal(result.recommendations[0].missionId, 'mission-sentence-detectives');
  assert.deepEqual(result.recommendations[0].reasonCodes, [
    'overdue_review',
    'assignment_urgent',
    'weak_skill',
    'mastery_gap',
    'goal_match',
    'prerequisite_ready',
    'lesson_ready'
  ]);
  assert.equal(result.recommendations[0].nextAction.type, 'lesson');
  assert.equal(result.recommendations[0].nextAction.stepId, 'lesson-sentence-types');
  assert.equal(result.recommendations[0].target.type, 'guided_mission');
  assert.equal(result.recommendations[0].target.missionId, 'mission-sentence-detectives');
  assert.match(result.recommendations[0].explanation.summary, /Grammar|sentence-analysis|review|assignment/i);
  assert.equal(JSON.stringify(result).includes('Hidden'), false);
  assert.equal(JSON.stringify(result).includes('raw prompt'), false);
  assert.equal(JSON.stringify(result).includes('raw answer'), false);
});

test('mission recommendation policy sequences mastery repair after completed lesson and practice evidence', () => {
  const result = recommendations.generateMissionRecommendations({
    catalog,
    learnerGrade: 5,
    now,
    recentSessions: [{
      completedAt: '2030-04-28T12:00:00.000Z',
      attempts: [
        missed('grammar.sentence-analysis', 'grammar-sentence-types-q1', 'medium', 5),
        missed('grammar.sentence-analysis', 'grammar-sentence-types-q2', 'medium', 5),
        correct('grammar.sentence-analysis', 'grammar-sentence-types-q3', 'medium', 5)
      ]
    }],
    reviewSchedule: [{
      ref: { id: 'grammar-sentence-types-q1' },
      skillIds: ['grammar.sentence-analysis'],
      setId: 'grammar-sentence-types',
      dueAt: '2030-04-28T12:00:00.000Z'
    }],
    lessonProgress: [
      { setId: 'grammar-sentence-types', status: 'completed', completedAt: '2030-04-28T12:00:00.000Z' }
    ],
    missionProgress: {
      'mission-sentence-detectives': {
        completedStepIds: ['lesson-sentence-types', 'practice-sentence-types']
      }
    }
  });

  const sentenceMission = result.recommendations.find(item => item.missionId === 'mission-sentence-detectives');
  assert.ok(sentenceMission);
  assert.equal(sentenceMission.nextAction.type, 'review');
  assert.equal(sentenceMission.nextAction.stepId, 'review-sentence-types');
  assert.deepEqual(sentenceMission.repairSequence.map(step => `${step.type}:${step.status}`), [
    'lesson:completed',
    'practice:completed',
    'review:current',
    'reflection:optional'
  ]);
});

test('mission recommendation policy suppresses repeated practice without fresh mastery or assignment evidence', () => {
  const result = recommendations.generateMissionRecommendations({
    catalog,
    learnerGrade: 3,
    now,
    recentSessions: [{
      completedAt: '2030-04-29T11:00:00.000Z',
      attempts: [
        correct('capitalization.capitalization', 'capitalization-sentence-beginning-q1', 'easy', 3),
        correct('capitalization.capitalization', 'capitalization-sentence-beginning-q2', 'easy', 3),
        correct('capitalization.capitalization', 'capitalization-sentence-beginning-q3', 'medium', 3),
        correct('capitalization.capitalization', 'capitalization-sentence-beginning-q4', 'medium', 3)
      ]
    }],
    lessonProgress: [
      { setId: 'capitalization-sentence-beginning', status: 'completed', completedAt: '2030-04-28T12:00:00.000Z' }
    ],
    missionProgress: {
      'mission-capitalization-starter-trail': {
        completedStepIds: [
          'lesson-capitalization-start',
          'practice-capitalization-start',
          'review-capitalization-start'
        ]
      }
    }
  });

  assert.equal(result.recommendations.some(item => item.missionId === 'mission-capitalization-starter-trail'), false);
  assert.ok(result.suppressed.some(item =>
    item.missionId === 'mission-capitalization-starter-trail' &&
    item.reasonCode === 'repeated_practice_guard'
  ));
});

test('mission recommendation fairness keeps equal evidence deterministic across grade and difficulty', () => {
  const grade3 = recommendations.generateMissionRecommendations(equalEvidenceInput({ learnerGrade: 3, difficulty: 'easy' }));
  const grade5 = recommendations.generateMissionRecommendations(equalEvidenceInput({ learnerGrade: 5, difficulty: 'hard' }));

  assert.deepEqual(grade3.recommendations.map(item => item.missionId), [
    'mission-capitalization-starter-trail',
    'mission-sentence-detectives'
  ]);
  assert.deepEqual(grade5.recommendations.map(item => item.missionId), [
    'mission-capitalization-starter-trail',
    'mission-sentence-detectives'
  ]);
  assert.deepEqual(
    grade3.recommendations.map(item => item.reasonCodes),
    grade5.recommendations.map(item => item.reasonCodes)
  );
});

function equalEvidenceInput({ learnerGrade, difficulty }) {
  return {
    catalog,
    learnerGrade,
    now,
    recentSessions: [{
      completedAt: '2030-04-28T12:00:00.000Z',
      attempts: [
        missed('capitalization.capitalization', 'capitalization-sentence-beginning-q1', difficulty, learnerGrade),
        missed('capitalization.capitalization', 'capitalization-sentence-beginning-q2', difficulty, learnerGrade),
        correct('capitalization.capitalization', 'capitalization-sentence-beginning-q3', difficulty, learnerGrade),
        missed('grammar.sentence-analysis', 'grammar-sentence-types-q1', difficulty, learnerGrade),
        missed('grammar.sentence-analysis', 'grammar-sentence-types-q2', difficulty, learnerGrade),
        correct('grammar.sentence-analysis', 'grammar-sentence-types-q3', difficulty, learnerGrade)
      ]
    }]
  };
}

function missed(skillId, questionId, difficulty, gradeLevel) {
  return {
    questionId,
    correct: false,
    skillIds: [skillId],
    difficulty,
    gradeLevel,
    question: 'raw prompt',
    answer: 'raw answer'
  };
}

function correct(skillId, questionId, difficulty, gradeLevel) {
  return { questionId, correct: true, skillIds: [skillId], difficulty, gradeLevel };
}
