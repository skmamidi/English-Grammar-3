(function () {
  'use strict';

  const state = {
    students: [],
    selectedStudentId: '',
    selectedView: 'overview',
    selectedSessionId: '',
    selectedQuestionId: '',
    query: ''
  };

  document.addEventListener('DOMContentLoaded', initReports);

  async function initReports() {
    renderLoadingState();
    state.students = await buildStudents();
    state.selectedStudentId = state.students[0] ? state.students[0].id : '';
    bindEvents();
    render();
    window.addEventListener('grammarquest:auth-state', async () => {
      state.students = await buildStudents();
      if (!state.students.some(student => student.id === state.selectedStudentId)) {
        state.selectedStudentId = state.students[0] ? state.students[0].id : '';
      }
      render();
    });
  }

  function bindEvents() {
    const search = document.getElementById('report-search');
    const print = document.getElementById('print-report');
    const seed = document.getElementById('seed-demo');

    if (search) {
      search.addEventListener('input', () => {
        state.query = search.value.trim().toLowerCase();
        renderRoster();
      });
    }

    if (print) print.addEventListener('click', () => window.print());
    if (seed) {
      seed.addEventListener('click', async () => {
        state.students = await buildStudents(true);
        if (!state.students.some(student => student.id === state.selectedStudentId)) {
          state.selectedStudentId = state.students[0] ? state.students[0].id : '';
        }
        render();
      });
    }

    document.querySelectorAll('.report-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        state.selectedView = tab.dataset.view || 'overview';
        document.querySelectorAll('.report-tab').forEach(item => {
          item.classList.toggle('active', item === tab);
        });
        renderDetail();
      });
    });
  }

  function render() {
    renderKpis();
    renderRoster();
    renderSummary();
    renderDetail();
  }

  function renderLoadingState() {
    const list = document.getElementById('student-list');
    const summary = document.getElementById('student-summary');
    const detail = document.getElementById('report-detail');
    if (list) list.innerHTML = '<p class="empty-report">Loading reports...</p>';
    if (summary) summary.innerHTML = '';
    if (detail) detail.innerHTML = '';
  }

  async function buildStudents(forceSample) {
    const authState = await getAuthState();
    const parentMode = !!authState.parentMode;
    const progress = loadProgress();
    const sessions = progress.reports && Array.isArray(progress.reports.sessions)
      ? progress.reports.sessions
      : [];
    const groups = {};
    const cloudStudents = await loadCloudStudents();

    if (!parentMode) sessions.forEach(session => {
      const id = session.studentId || 'current-learner';
      if (!groups[id]) {
        groups[id] = {
          id,
          name: session.studentName || 'Current Learner',
          avatar: getInitials(session.studentName || 'Current Learner'),
          source: 'Saved',
          sessions: []
        };
      }
      groups[id].sessions.push(session);
    });

    if (!parentMode && !groups['current-learner']) {
      groups['current-learner'] = {
        id: 'current-learner',
        name: loadSetting('grammarQuestActiveStudentName', 'Current Learner'),
        avatar: 'CL',
        source: 'Saved',
        sessions: []
      };
    }
    if (groups['current-learner']) groups['current-learner'].progress = progress;

    const students = Object.keys(groups).map(id => enrichStudent(groups[id]));
    cloudStudents.forEach(student => {
      const enriched = enrichStudent(student);
      const existingIndex = students.findIndex(item => item.id === enriched.id);
      if (existingIndex >= 0) students[existingIndex] = enriched;
      else students.push(enriched);
    });

    if (forceSample) {
      getSampleStudents().forEach(sample => {
        if (!students.some(student => student.id === sample.id)) students.push(enrichStudent(sample));
      });
    }
    return students.sort((a, b) => b.lastActivity.localeCompare(a.lastActivity) || a.name.localeCompare(b.name));
  }

  async function loadCloudStudents() {
    const auth = window.GrammarQuestAuth;
    if (!auth || typeof auth.ready !== 'function') return [];

    try {
      const authState = await getAuthState();
      if (!authState.signedIn) return [];
      if (authState.signedIn && typeof auth.loadManagedStudents === 'function') {
        return await auth.loadManagedStudents();
      }
      if (authState.activeStudent && typeof auth.loadStudentProgress === 'function') {
        const progress = await auth.loadStudentProgress(authState.activeStudent.id);
        return [{
          id: authState.activeStudent.id,
          name: authState.activeStudent.name || 'Student',
          avatar: getInitials(authState.activeStudent.name || 'Student'),
          avatarParts: authState.activeStudent.avatarParts || null,
          avatarSvg: renderStudentAvatar(authState.activeStudent),
          source: 'Cloud',
          progress: progress || {},
          sessions: progress && progress.reports && Array.isArray(progress.reports.sessions) ? progress.reports.sessions : []
        }];
      }
    } catch (error) {
      console.warn('Could not load cloud reports:', error);
    }

    return [];
  }

  async function getAuthState() {
    const auth = window.GrammarQuestAuth;
    if (!auth || typeof auth.ready !== 'function') return {};
    try {
      await auth.ready();
      return auth.getState ? auth.getState() : {};
    } catch (error) {
      return {};
    }
  }

  function enrichStudent(student) {
    const sessions = (student.sessions || []).slice().sort((a, b) => String(b.completedAt || '').localeCompare(String(a.completedAt || '')));
    const attempts = sessions.flatMap(session => (session.attempts || []).map(attempt => Object.assign({ session }, attempt)));
    const correct = attempts.filter(attempt => attempt.correct).length;
    const total = attempts.length;
    const accuracy = total ? correct / total : 0;
    const firstTry = total ? attempts.filter(attempt => attempt.firstAttemptCorrect).length / total : 0;
    const skillMap = {};

    attempts.forEach(attempt => {
      const skills = attempt.skills && attempt.skills.length ? attempt.skills : [attempt.subtopicTitle || 'Mixed practice'];
      skills.forEach(skill => {
        const key = slugify(skill);
        if (!skillMap[key]) skillMap[key] = { label: titleCase(skill), correct: 0, total: 0 };
        skillMap[key].correct += attempt.correct ? 1 : 0;
        skillMap[key].total += 1;
      });
    });

    const skills = Object.keys(skillMap).map(key => {
      const item = skillMap[key];
      return Object.assign(item, {
        key,
        accuracy: item.total ? item.correct / item.total : 0,
        level: getLevel(item.correct, item.total)
      });
    }).sort((a, b) => a.accuracy - b.accuracy || b.total - a.total);

    const daily = buildDailyRows(sessions);
    const topicStats = buildTopicRows(sessions);
    const questionRisks = buildQuestionRisks(attempts);

    return Object.assign({}, student, {
      sessions,
      attempts,
      daily,
      topicStats,
      questionRisks,
      accuracy,
      firstTry,
      totalQuestions: total,
      totalCorrect: correct,
      practiceMinutes: Math.round(sessions.reduce((sum, session) => sum + (Number(session.durationSeconds) || 0), 0) / 60),
      lastActivity: sessions[0] && sessions[0].completedAt || '',
      prioritySkill: skills.find(skill => skill.total >= 2) || skills[0] || null,
      skills
    });
  }

  function renderKpis() {
    const target = document.getElementById('report-kpis');
    if (!target) return;
    const active = state.students.filter(student => student.totalQuestions > 0);
    const attempts = active.flatMap(student => student.attempts);
    const accuracy = attempts.length ? attempts.filter(attempt => attempt.correct).length / attempts.length : 0;
    const firstTry = attempts.length ? attempts.filter(attempt => attempt.firstAttemptCorrect).length / attempts.length : 0;
    const priority = active.map(student => student.prioritySkill).filter(Boolean).sort((a, b) => a.accuracy - b.accuracy)[0];

    target.innerHTML = [
      renderKpi('Students', String(state.students.length), `${active.length} with practice data`),
      renderKpi('Avg accuracy', formatPercent(accuracy), `${attempts.length} answered questions`),
      renderKpi('First try', formatPercent(firstTry), 'Questions correct before review'),
      renderKpi('Focus', priority ? priority.label : 'Start practice', priority ? `${formatPercent(priority.accuracy)} across ${priority.total}` : 'No weak skill yet')
    ].join('');
  }

  function renderKpi(label, value, meta) {
    return `
      <div class="report-kpi">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
        <small>${escapeHtml(meta)}</small>
      </div>
    `;
  }

  function renderRoster() {
    const list = document.getElementById('student-list');
    const count = document.getElementById('student-count');
    if (!list) return;
    const visible = state.students.filter(student => {
      if (!state.query) return true;
      const haystack = [student.name, student.source, student.prioritySkill && student.prioritySkill.label]
        .concat(student.skills.map(skill => skill.label))
        .join(' ')
        .toLowerCase();
      return haystack.includes(state.query);
    });

    if (count) count.textContent = `${visible.length} shown`;
    list.innerHTML = visible.map(student => `
      <button class="student-row ${student.id === state.selectedStudentId ? 'active' : ''}" type="button" data-student-id="${escapeHtml(student.id)}">
        ${renderStudentAvatarMarkup(student)}
        <span class="student-row-main">
          <strong>${escapeHtml(student.name)}</strong>
          <span>${student.totalQuestions ? `${formatPercent(student.accuracy)} accuracy · ${student.sessions.length} sessions` : 'No completed quizzes yet'}</span>
        </span>
        <b>${student.prioritySkill ? escapeHtml(student.prioritySkill.label) : 'Ready'}</b>
      </button>
    `).join('') || '<p class="empty-report">No students match that search.</p>';

    list.querySelectorAll('.student-row').forEach(row => {
      row.addEventListener('click', () => {
        state.selectedStudentId = row.dataset.studentId;
        state.selectedSessionId = '';
        state.selectedQuestionId = '';
        renderRoster();
        renderSummary();
        renderDetail();
      });
    });
  }

  function renderSummary() {
    const target = document.getElementById('student-summary');
    const student = getSelectedStudent();
    if (!target || !student) return;
    const level = getLevel(student.totalCorrect, student.totalQuestions);
    target.innerHTML = `
      <section class="selected-student-card">
        <div class="selected-student-id">
          ${renderStudentAvatarMarkup(student, true)}
          <div>
            <span class="quest-kicker">${escapeHtml(student.source || 'Saved')}</span>
            <h2>${escapeHtml(student.name)}</h2>
            <p>${student.lastActivity ? `Last practice ${formatDate(student.lastActivity)}` : 'Ready for first quiz'}</p>
          </div>
        </div>
        <div class="selected-student-stats">
          <div><strong>${formatPercent(student.accuracy)}</strong><span>accuracy</span></div>
          <div><strong>${formatPercent(student.firstTry)}</strong><span>first try</span></div>
          <div><strong>${student.practiceMinutes}m</strong><span>practice</span></div>
          <div><strong>${escapeHtml(level)}</strong><span>status</span></div>
        </div>
      </section>
    `;
  }

  function renderDetail() {
    const target = document.getElementById('report-detail');
    const student = getSelectedStudent();
    if (!target || !student) return;
    if (state.selectedView === 'questions') {
      renderQuestionView(target, student);
    } else if (state.selectedView === 'skills') {
      renderSkillView(target, student);
    } else {
      renderOverview(target, student);
    }
  }

  function renderOverview(target, student) {
    if (!student.sessions.length) {
      target.innerHTML = renderEmptyState(student);
      return;
    }

    const recentSessions = student.sessions.slice(0, 6).map(session => `
      <button class="session-row" type="button" data-session-id="${escapeHtml(session.id)}">
        <span>
          <strong>${escapeHtml(session.title || 'Practice Quiz')}</strong>
          <small>${escapeHtml(session.topic || 'ELA')} · ${formatDate(session.completedAt)}</small>
        </span>
        <b>${session.score}/${session.total}</b>
        <em>${formatMinutes(session.durationSeconds)}</em>
      </button>
    `).join('');

    const priorityRows = student.skills.slice(0, 5).map(skill => `
      <div class="skill-row">
        <span>
          <strong>${escapeHtml(skill.label)}</strong>
          <small>${skill.correct}/${skill.total} correct · ${escapeHtml(skill.level)}</small>
        </span>
        <span class="skill-meter"><i style="width:${Math.round(skill.accuracy * 100)}%"></i></span>
        <b>${formatPercent(skill.accuracy)}</b>
      </div>
    `).join('');
    const dailyRows = student.daily.slice(0, 7).map(day => `
      <div class="skill-row">
        <span>
          <strong>${escapeHtml(formatDayLabel(day.date))}</strong>
          <small>${day.questions} attempted · ${day.correct} correct · ${day.topicCount} topics</small>
        </span>
        <span class="skill-meter"><i style="width:${Math.round(day.accuracy * 100)}%"></i></span>
        <b>${formatPercent(day.accuracy)}</b>
      </div>
    `).join('');

    const riskRows = student.questionRisks.slice(0, 5).map(item => `
      <div class="question-risk-row">
        <strong>${escapeHtml(truncate(item.question, 90))}</strong>
        <span>${item.misses}/${item.attempts} missed · ${escapeHtml(item.subtopicTitle || 'Mixed practice')} · last ${formatDate(item.lastMissedAt)}</span>
      </div>
    `).join('');

    target.innerHTML = `
      <div class="report-two-column">
        <section class="report-card">
          <div class="report-panel-heading">
            <h3>Recent Practice</h3>
            <span>${student.sessions.length} sessions</span>
          </div>
          <div class="session-list">${recentSessions}</div>
        </section>
        <section class="report-card">
          <div class="report-panel-heading">
            <h3>Priority Skills</h3>
            <span>${student.prioritySkill ? escapeHtml(student.prioritySkill.label) : 'Ready'}</span>
          </div>
          <div class="skill-list">${priorityRows || '<p class="empty-report">Skill evidence appears after quizzes.</p>'}</div>
        </section>
      </div>
      <div class="report-two-column">
        <section class="report-card">
          <div class="report-panel-heading">
            <h3>Daily Practice</h3>
            <span>${student.daily.length} active days</span>
          </div>
          <div class="skill-list">${dailyRows || '<p class="empty-report">Daily stats appear after completed quizzes.</p>'}</div>
        </section>
        <section class="report-card">
          <div class="report-panel-heading">
            <h3>Questions to Revisit</h3>
            <span>${student.questionRisks.length} repeated misses</span>
          </div>
          <div class="question-risk-list">${riskRows || '<p class="empty-report">No repeated misses yet.</p>'}</div>
        </section>
      </div>
    `;

    target.querySelectorAll('.session-row').forEach(row => {
      row.addEventListener('click', () => {
        state.selectedSessionId = row.dataset.sessionId;
        state.selectedView = 'questions';
        syncTabs();
        renderDetail();
      });
    });
  }

  function renderQuestionView(target, student) {
    const session = student.sessions.find(item => item.id === state.selectedSessionId) || student.sessions[0];
    if (!session) {
      target.innerHTML = renderEmptyState(student);
      return;
    }
    state.selectedSessionId = session.id;
    const attempts = session.attempts || [];
    const selectedQuestion = attempts.find(item => item.id === state.selectedQuestionId) || attempts[0];
    if (selectedQuestion) state.selectedQuestionId = selectedQuestion.id;

    target.innerHTML = `
      <section class="question-report">
        <div class="question-report-toolbar">
          <label>
            Session
            <select id="session-select">
              ${student.sessions.map(item => `<option value="${escapeHtml(item.id)}" ${item.id === session.id ? 'selected' : ''}>${escapeHtml(item.title || 'Quiz')} · ${formatDate(item.completedAt)}</option>`).join('')}
            </select>
          </label>
          <div class="session-score-pill">${session.score}/${session.total} · ${formatPercent((session.score || 0) / Math.max(1, session.total || 1))}</div>
        </div>
        <div class="question-grid">
          <div class="question-table-wrap">
            <table class="question-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Question</th>
                  <th>Selected</th>
                  <th>Right Answer</th>
                  <th>Try</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                ${attempts.map(attempt => renderQuestionRow(attempt, selectedQuestion, student, session)).join('')}
              </tbody>
            </table>
          </div>
          <aside class="question-inspector">
            ${renderQuestionInspector(selectedQuestion, student)}
          </aside>
        </div>
      </section>
    `;

    const select = document.getElementById('session-select');
    if (select) {
      select.addEventListener('change', () => {
        state.selectedSessionId = select.value;
        state.selectedQuestionId = '';
        renderDetail();
      });
    }
    target.querySelectorAll('.question-table tbody tr').forEach(row => {
      row.addEventListener('click', () => {
        state.selectedQuestionId = row.dataset.questionId;
        renderDetail();
      });
    });
  }

  function renderQuestionRow(attempt, selectedQuestion, student, session) {
    const selected = selectedQuestion && attempt.id === selectedQuestion.id;
    const history = getQuestionHistory(student, attempt.id);
    const historyIndex = Math.max(0, history.findIndex(item => item.completedAt === session.completedAt));
    const attemptLabel = attempt.correct ? `${ordinal(historyIndex + 1)} correct` : `${ordinal(historyIndex + 1)} missed`;
    return `
      <tr class="${selected ? 'selected' : ''}" data-question-id="${escapeHtml(attempt.id)}">
        <td>${attempt.position || ''}</td>
        <td>${escapeHtml(truncate(attempt.question, 58))}</td>
        <td>${escapeHtml(attempt.selectedChoice || 'No answer')}</td>
        <td>${escapeHtml(attempt.correctChoice || '')}</td>
        <td>${escapeHtml(attemptLabel)}</td>
        <td><span class="result-chip ${attempt.correct ? 'right' : 'wrong'}">${attempt.correct ? 'Right' : 'Missed'}</span></td>
      </tr>
    `;
  }

  function renderQuestionInspector(attempt, student) {
    if (!attempt) return '<p class="empty-report">Choose a question to inspect the answer trail.</p>';
    const history = getQuestionHistory(student, attempt.id);
    return `
      <div class="inspector-section">
        <span class="quest-kicker">Question Detail</span>
        <h3>${escapeHtml(attempt.question)}</h3>
        <div class="answer-comparison">
          <div>
            <span>Selected</span>
            <strong>${escapeHtml(attempt.selectedChoice || 'No answer')}</strong>
          </div>
          <div>
            <span>Correct</span>
            <strong>${escapeHtml(attempt.correctChoice || '')}</strong>
          </div>
        </div>
        <dl class="answer-meta">
          <div><dt>First attempt</dt><dd>${attempt.firstAttemptCorrect ? 'Correct' : 'Not yet'}</dd></div>
          <div><dt>Confidence</dt><dd>${escapeHtml(formatConfidence(attempt.confidence))}</dd></div>
          <div><dt>Hint opened</dt><dd>${attempt.hintUsed ? 'Yes' : 'No'}</dd></div>
          <div><dt>Skill</dt><dd>${escapeHtml((attempt.skills || []).map(titleCase).join(', ') || attempt.subtopicTitle || 'Mixed practice')}</dd></div>
        </dl>
      </div>
      <div class="inspector-section">
        <h3>Attempt History</h3>
        ${history.map((item, index) => `
          <div class="attempt-history-row">
            <span>${ordinal(index + 1)} attempt · ${formatDate(item.completedAt)}</span>
            <b class="${item.correct ? 'right-text' : 'wrong-text'}">${item.correct ? 'Right' : 'Missed'}</b>
          </div>
        `).join('') || '<p class="empty-report">No earlier attempts for this question.</p>'}
      </div>
    `;
  }

  function renderSkillView(target, student) {
    const rows = student.skills.map(skill => `
      <div class="skill-detail-row">
        <div>
          <strong>${escapeHtml(skill.label)}</strong>
          <span>${skill.correct}/${skill.total} correct · ${escapeHtml(skill.level)}</span>
        </div>
        <span class="skill-meter"><i style="width:${Math.round(skill.accuracy * 100)}%"></i></span>
        <b>${formatPercent(skill.accuracy)}</b>
      </div>
    `).join('');

    const topicRows = student.topicStats.map(topic => `
      <div class="skill-detail-row">
        <div>
          <strong>${escapeHtml(topic.label)}</strong>
          <span>${topic.correct}/${topic.attempted} correct · ${topic.sessions} sessions</span>
        </div>
        <span class="skill-meter"><i style="width:${Math.round(topic.accuracy * 100)}%"></i></span>
        <b>${formatPercent(topic.accuracy)}</b>
      </div>
    `).join('');

    target.innerHTML = `
      <section class="report-card">
        <div class="report-panel-heading">
          <h3>Topic Coverage</h3>
          <span>${student.topicStats.length} topics</span>
        </div>
        <div class="skill-detail-list">${topicRows || '<p class="empty-report">Topic evidence appears after completed quizzes.</p>'}</div>
      </section>
      <section class="report-card">
        <div class="report-panel-heading">
          <h3>Skill Evidence</h3>
          <span>${student.skills.length} skills</span>
        </div>
        <div class="skill-detail-list">${rows || '<p class="empty-report">Skill evidence appears after completed quizzes.</p>'}</div>
      </section>
    `;
  }

  function renderEmptyState(student) {
    return `
      <section class="report-card empty-report-card">
        <h3>${escapeHtml(student.name)} has no completed quizzes yet.</h3>
        <p>Once practice is completed, this report will show accuracy, time, skill evidence, and question-by-question answer history.</p>
        <a class="btn btn-primary" href="index.html">Start practice</a>
      </section>
    `;
  }

  function getSelectedStudent() {
    return state.students.find(student => student.id === state.selectedStudentId) || state.students[0];
  }

  function getQuestionHistory(student, questionId) {
    return student.sessions
      .slice()
      .reverse()
      .flatMap(session => (session.attempts || [])
        .filter(attempt => attempt.id === questionId)
        .map(attempt => Object.assign({ completedAt: session.completedAt }, attempt)));
  }

  function buildDailyRows(sessions) {
    const daily = {};
    sessions.forEach(session => {
      const date = String(session.completedAt || '').slice(0, 10) || 'unknown';
      if (!daily[date]) daily[date] = { date, sessions: 0, questions: 0, correct: 0, minutes: 0, topics: {} };
      daily[date].sessions += 1;
      daily[date].questions += Number(session.total) || 0;
      daily[date].correct += Number(session.score) || 0;
      daily[date].minutes += Math.round((Number(session.durationSeconds) || 0) / 60);
      daily[date].topics[session.topic || 'English Language Arts'] = true;
    });
    return Object.keys(daily).map(date => Object.assign(daily[date], {
      topicCount: Object.keys(daily[date].topics).length,
      accuracy: daily[date].questions ? daily[date].correct / daily[date].questions : 0
    })).sort((a, b) => b.date.localeCompare(a.date));
  }

  function buildTopicRows(sessions) {
    const topics = {};
    sessions.forEach(session => {
      const key = session.topic || 'English Language Arts';
      if (!topics[key]) topics[key] = { label: key, attempted: 0, correct: 0, sessions: 0 };
      topics[key].attempted += Number(session.total) || 0;
      topics[key].correct += Number(session.score) || 0;
      topics[key].sessions += 1;
    });
    return Object.keys(topics).map(key => Object.assign(topics[key], {
      accuracy: topics[key].attempted ? topics[key].correct / topics[key].attempted : 0
    })).sort((a, b) => a.label.localeCompare(b.label));
  }

  function buildQuestionRisks(attempts) {
    const questions = {};
    attempts.forEach(attempt => {
      const key = attempt.id || attempt.question;
      if (!key) return;
      if (!questions[key]) {
        questions[key] = {
          id: key,
          question: attempt.question || '',
          subtopicTitle: attempt.subtopicTitle || '',
          correctChoice: attempt.correctChoice || '',
          attempts: 0,
          misses: 0,
          lastMissedAt: ''
        };
      }
      questions[key].attempts += 1;
      if (!attempt.correct) {
        questions[key].misses += 1;
        questions[key].lastMissedAt = attempt.session?.completedAt || attempt.completedAt || '';
      }
    });
    return Object.keys(questions)
      .map(key => Object.assign(questions[key], {
        missRate: questions[key].attempts ? questions[key].misses / questions[key].attempts : 0
      }))
      .filter(item => item.misses > 0)
      .sort((a, b) => b.misses - a.misses || b.missRate - a.missRate);
  }

  function syncTabs() {
    document.querySelectorAll('.report-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.view === state.selectedView);
    });
  }

  function loadProgress() {
    if (window.GrammarQuestProgress && typeof window.GrammarQuestProgress.loadLocalProgress === 'function') {
      return window.GrammarQuestProgress.loadLocalProgress();
    }
    try {
      return JSON.parse(localStorage.getItem('grammarQuestProgress')) || {};
    } catch (error) {
      return {};
    }
  }

  function loadSetting(key, fallback) {
    try {
      return localStorage.getItem(key) || fallback;
    } catch (error) {
      return fallback;
    }
  }

  function getSampleStudents() {
    const base = new Date();
    const sessions = [
      makeSampleSession('sample-raaga', 'Raaga', 'Vocabulary / Word Study', 'Base Words, Prefixes, and Suffixes', 9, 12, 41, base, [
        ['What does the prefix re- in reread mean?', ['not', 'again', 'before', 'wrongly'], 1, 1, ['prefixes', 'word analysis']],
        ['Which word means without care?', ['careful', 'careless', 'caring', 'caretaker'], 1, 0, ['suffixes', 'word meaning']],
        ['Break apart unhappily.', ['un- / happy / -ly', 'unh- / app / -ily', 'un- / happi / -ly', 'u- / happy / -ily'], 0, 0, ['morphology']]
      ]),
      makeSampleSession('sample-raaga', 'Raaga', 'Grammar & Usage', 'Subject-Verb Agreement', 7, 10, 38, addDays(base, -3), [
        ['Choose the sentence with correct agreement.', ['The dogs runs.', 'The dog run.', 'The dogs run.', 'The dog running.'], 2, 2, ['subject verb agreement']],
        ['Which verb agrees with Maya?', ['walk', 'walks', 'walking', 'walked'], 1, 0, ['verbs']]
      ]),
      makeSampleSession('sample-swara', 'Swara', 'Punctuation', 'Commas in a Series', 11, 12, 36, addDays(base, -1), [
        ['Where should commas go?', ['red blue and green', 'red, blue, and green', 'red blue, and green', 'red, blue and, green'], 1, 1, ['commas', 'series punctuation']],
        ['Choose the correctly punctuated sentence.', ['I packed pencils paper and glue.', 'I packed pencils, paper, and glue.', 'I packed, pencils paper and glue.', 'I packed pencils paper, and glue.'], 1, 1, ['commas']]
      ]),
      makeSampleSession('sample-mira', 'Mira', 'Reading Comprehension', 'Inference', 6, 10, 44, addDays(base, -2), [
        ['What can you infer from the character closing the door softly?', ['She is angry.', 'She is trying not to wake someone.', 'She is lost.', 'She forgot the door.'], 1, 0, ['inference', 'text evidence']],
        ['Which clue best supports the inference?', ['softly', 'door', 'character', 'closing'], 0, 0, ['text evidence']]
      ])
    ];

    return [
      { id: 'sample-raaga', name: 'Raaga', avatar: 'RA', source: 'Sample', sessions: sessions.filter(session => session.studentId === 'sample-raaga') },
      { id: 'sample-swara', name: 'Swara', avatar: 'SW', source: 'Sample', sessions: sessions.filter(session => session.studentId === 'sample-swara') },
      { id: 'sample-mira', name: 'Mira', avatar: 'MI', source: 'Sample', sessions: sessions.filter(session => session.studentId === 'sample-mira') }
    ];
  }

  function makeSampleSession(studentId, studentName, topic, title, score, total, minutes, date, questionDefs) {
    const completedAt = date.toISOString();
    const attempts = questionDefs.map((def, index) => ({
      id: `${slugify(title)}-${index + 1}`,
      position: index + 1,
      question: def[0],
      choices: def[1],
      correctIndex: def[2],
      selectedIndex: def[3],
      correctChoice: def[1][def[2]],
      selectedChoice: def[1][def[3]],
      correct: def[2] === def[3],
      firstAttemptCorrect: def[2] === def[3],
      confidence: index % 2 ? 'thinking' : 'certain',
      hintUsed: def[2] !== def[3],
      grade: '4',
      difficulty: 'medium',
      subtopicTitle: title,
      skills: def[4],
      standards: [{ id: 'ELA.3-6.Mixed', label: 'Mixed ELA Practice' }],
      completedAt
    }));

    while (attempts.length < total) {
      const seed = attempts[attempts.length % questionDefs.length];
      const number = attempts.length + 1;
      const correct = number <= score;
      attempts.push(Object.assign({}, seed, {
        id: `${slugify(title)}-${number}`,
        position: number,
        correct,
        firstAttemptCorrect: correct,
        selectedChoice: correct ? seed.correctChoice : seed.choices.find(choice => choice !== seed.correctChoice),
        selectedIndex: correct ? seed.correctIndex : seed.choices.findIndex(choice => choice !== seed.correctChoice)
      }));
    }

    return {
      id: `${studentId}-${slugify(title)}-${date.getTime()}`,
      studentId,
      studentName,
      title,
      topic,
      grade: '4',
      difficulty: 'medium',
      score,
      total,
      percentage: Math.round((score / total) * 100),
      startedAt: addMinutes(date, -minutes).toISOString(),
      completedAt,
      durationSeconds: minutes * 60,
      attempts
    };
  }

  function formatPercent(value) {
    return `${Math.round((Number(value) || 0) * 100)}%`;
  }

  function formatDate(value) {
    if (!value) return 'No date';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'No date';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function formatDayLabel(value) {
    if (!value || value === 'unknown') return 'Unknown day';
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }

  function formatMinutes(seconds) {
    const minutes = Math.max(1, Math.round((Number(seconds) || 0) / 60));
    return `${minutes}m`;
  }

  function formatConfidence(value) {
    if (value === 'certain') return 'I can prove it';
    if (value === 'exploring') return 'Need clues';
    return 'Pretty sure';
  }

  function getLevel(correct, total) {
    if (!total) return 'Not started';
    const accuracy = correct / total;
    if (total < 5) return 'Collecting';
    if (accuracy >= 0.9) return 'Secure';
    if (accuracy >= 0.75) return 'Growing';
    return 'Needs focus';
  }

  function getInitials(name) {
    return String(name || 'Learner').split(/\s+/).map(part => part.charAt(0)).join('').slice(0, 2).toUpperCase();
  }

  function renderStudentAvatarMarkup(student, large) {
    const svg = renderStudentAvatar(student);
    if (svg) {
      return `<span class="student-avatar ${large ? 'large' : ''} custom">${svg}</span>`;
    }
    return `<span class="student-avatar ${large ? 'large' : ''}">${escapeHtml(student.avatar || getInitials(student.name))}</span>`;
  }

  function renderStudentAvatar(student) {
    if (student.avatarSvg) return student.avatarSvg;
    const avatar = window.GrammarQuestAvatar;
    if (avatar && typeof avatar.render === 'function' && student.avatarParts) {
      return avatar.render({ ...student.avatarParts, studentName: student.name });
    }
    return '';
  }

  function ordinal(number) {
    if (number === 1) return '1st';
    if (number === 2) return '2nd';
    if (number === 3) return '3rd';
    return `${number}th`;
  }

  function titleCase(text) {
    return String(text || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
  }

  function slugify(text) {
    return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function truncate(text, length) {
    const value = String(text || '');
    return value.length > length ? `${value.slice(0, length - 1)}...` : value;
  }

  function addDays(date, days) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  function addMinutes(date, minutes) {
    const next = new Date(date);
    next.setMinutes(next.getMinutes() + minutes);
    return next;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text == null ? '' : text);
    return div.innerHTML;
  }
})();
