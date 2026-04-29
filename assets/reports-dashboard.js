(function () {
  'use strict';

  const state = {
    students: [],
    selectedStudentId: '',
    selectedView: 'overview',
    selectedSessionId: '',
    selectedQuestionId: '',
    selectedReportId: '',
    fullQuestion: null,
    query: ''
  };
  let preferredFullQuestionSpeechVoice = null;

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

    const reportSource = student.progress && student.progress.reports
      ? student.progress.reports.questionReports
      : student.questionReports;
    const reportedQuestions = (Array.isArray(reportSource) ? reportSource : [])
      .slice()
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    const openReportCount = reportedQuestions.filter(report => !['resolved', 'dismissed'].includes(String(report.status || 'open'))).length;
    const daily = buildDailyRows(sessions);
    const topicStats = buildTopicRows(sessions);
    const questionRisks = buildQuestionRisks(attempts);

    return Object.assign({}, student, {
      sessions,
      reportedQuestions,
      openReportCount,
      attempts,
      daily,
      topicStats,
      questionRisks,
      accuracy,
      firstTry,
      totalQuestions: total,
      totalCorrect: correct,
      practiceMinutes: Math.round(sessions.reduce((sum, session) => sum + (Number(session.durationSeconds) || 0), 0) / 60),
      lastActivity: [sessions[0] && sessions[0].completedAt, reportedQuestions[0] && reportedQuestions[0].createdAt].filter(Boolean).sort().pop() || '',
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
    const openReports = state.students.reduce((sum, student) => sum + (Number(student.openReportCount) || 0), 0);

    target.innerHTML = [
      renderKpi('Students', String(state.students.length), `${active.length} with practice data`),
      renderKpi('Avg accuracy', formatPercent(accuracy), `${attempts.length} answered questions`),
      renderKpi('First try', formatPercent(firstTry), 'Questions correct before review'),
      renderKpi('Reports', String(openReports), openReports ? 'Questions awaiting review' : 'No open question reports')
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
        .concat((student.reportedQuestions || []).map(report => [report.question, report.reason, report.status].join(' ')))
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
          <span>${student.totalQuestions ? `${formatPercent(student.accuracy)} accuracy · ${student.sessions.length} sessions` : 'No completed quizzes yet'}${student.openReportCount ? ` · ${student.openReportCount} reports` : ''}</span>
        </span>
        <b>${student.prioritySkill ? escapeHtml(student.prioritySkill.label) : 'Ready'}</b>
      </button>
    `).join('') || '<p class="empty-report">No students match that search.</p>';

    list.querySelectorAll('.student-row').forEach(row => {
      row.addEventListener('click', () => {
        state.selectedStudentId = row.dataset.studentId;
        state.selectedSessionId = '';
        state.selectedQuestionId = '';
        state.selectedReportId = '';
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
          <div><strong>${student.openReportCount}</strong><span>open reports</span></div>
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
    } else if (state.selectedView === 'reported') {
      renderReportedQuestionView(target, student);
    } else if (state.selectedView === 'skills') {
      renderSkillView(target, student);
    } else {
      renderOverview(target, student);
    }
  }

  function renderOverview(target, student) {
    if (!student.sessions.length && !student.reportedQuestions.length) {
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
      <button class="question-risk-row" type="button" data-full-question-source="risk" data-question-id="${escapeHtml(item.id)}">
        <strong>${escapeHtml(truncate(item.question, 90))}</strong>
        <span>${item.misses}/${item.attempts} missed · ${escapeHtml(item.subtopicTitle || 'Mixed practice')} · last ${formatDate(item.lastMissedAt)}</span>
      </button>
    `).join('');
    const reportRows = student.reportedQuestions.slice(0, 5).map(report => `
      <button class="reported-question-row" type="button" data-report-id="${escapeHtml(report.id)}">
        <strong>${escapeHtml(truncate(report.question, 90))}</strong>
        <span>${escapeHtml(formatReportReason(report.reason))} · ${escapeHtml(formatReportStatus(report.status))} · ${formatDate(report.createdAt)}</span>
      </button>
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
      <section class="report-card">
        <div class="report-panel-heading">
          <h3>Reported Questions</h3>
          <span>${student.openReportCount} open</span>
        </div>
        <div class="reported-question-list">${reportRows || '<p class="empty-report">No reported questions yet.</p>'}</div>
      </section>
    `;

    target.querySelectorAll('.session-row').forEach(row => {
      row.addEventListener('click', () => {
        state.selectedSessionId = row.dataset.sessionId;
        state.selectedView = 'questions';
        syncTabs();
        renderDetail();
      });
    });
    target.querySelectorAll('.reported-question-row').forEach(row => {
      row.addEventListener('click', () => {
        state.selectedReportId = row.dataset.reportId;
        state.selectedView = 'reported';
        syncTabs();
        renderDetail();
      });
    });
    bindFullQuestionTriggers(target, student);
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
    bindFullQuestionTriggers(target, student);
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
    const trapTypes = Array.isArray(attempt.trapTypes) ? attempt.trapTypes : [];
    const reviewAttempts = Array.isArray(attempt.reviewAttempts) ? attempt.reviewAttempts : [];
    const latestReview = reviewAttempts.length ? reviewAttempts[reviewAttempts.length - 1] : null;
    return `
      <div class="inspector-section">
        <span class="quest-kicker">Question Detail</span>
        <h3>${escapeHtml(attempt.question)}</h3>
        <button class="btn btn-secondary full-question-inline-btn" type="button" data-full-question-source="attempt" data-question-id="${escapeHtml(attempt.id)}">See full question</button>
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
          <div><dt>Time on question</dt><dd>${formatSeconds(attempt.durationSeconds)}</dd></div>
          <div><dt>Trap pattern</dt><dd>${escapeHtml(trapTypes.join(', ') || 'None recorded')}</dd></div>
          <div><dt>Review result</dt><dd>${latestReview ? (latestReview.correct ? 'Corrected in review' : 'Still missed in review') : 'Not reviewed'}</dd></div>
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
        ${reviewAttempts.length ? `
          <h3>Review Practice</h3>
          ${reviewAttempts.map((item, index) => `
            <div class="attempt-history-row">
              <span>${ordinal(index + 1)} review · ${formatDate(item.completedAt)} · ${formatSeconds(item.durationSeconds)}</span>
              <b class="${item.correct ? 'right-text' : 'wrong-text'}">${item.correct ? 'Corrected' : 'Still missed'}</b>
            </div>
          `).join('')}
        ` : ''}
      </div>
    `;
  }

  function renderReportedQuestionView(target, student) {
    const reports = student.reportedQuestions || [];
    if (!reports.length) {
      target.innerHTML = `
        <section class="report-card empty-report-card">
          <h3>No reported questions for ${escapeHtml(student.name)}.</h3>
          <p>When a student taps “Report this question,” it will appear here for grown-up review.</p>
        </section>
      `;
      return;
    }

    const selectedReport = reports.find(item => item.id === state.selectedReportId) || reports[0];
    state.selectedReportId = selectedReport.id;

    target.innerHTML = `
      <section class="reported-question-report">
        <div class="reported-question-list">
          ${reports.map(report => renderReportedQuestionButton(report, selectedReport)).join('')}
        </div>
        <aside class="question-inspector">
          ${renderReportedQuestionInspector(selectedReport)}
        </aside>
      </section>
    `;

    target.querySelectorAll('.reported-question-row[data-report-id]').forEach(row => {
      row.addEventListener('click', () => {
        state.selectedReportId = row.dataset.reportId;
        renderDetail();
      });
    });
    bindFullQuestionTriggers(target, student);

    const saveButton = target.querySelector('[data-save-report-review]');
    if (saveButton) {
      saveButton.addEventListener('click', async () => {
        const status = target.querySelector('[data-report-review-status]');
        const note = target.querySelector('[data-report-review-note]');
        const message = target.querySelector('[data-report-review-message]');
        try {
          saveButton.disabled = true;
          await saveQuestionReportReview(student.id, selectedReport.id, {
            status: status ? status.value : 'open',
            grownupNote: note ? note.value : ''
          });
          if (message) message.textContent = 'Review saved.';
          state.students = await buildStudents();
          render();
        } catch (error) {
          if (message) message.textContent = error.message || 'Could not save this review.';
        } finally {
          saveButton.disabled = false;
        }
      });
    }
  }

  function renderReportedQuestionButton(report, selectedReport) {
    const selected = selectedReport && report.id === selectedReport.id;
    return `
      <button class="reported-question-row ${selected ? 'active' : ''}" type="button" data-report-id="${escapeHtml(report.id)}">
        <strong>${escapeHtml(truncate(report.question, 92))}</strong>
        <span>${escapeHtml(formatReportReason(report.reason))} · ${formatDate(report.createdAt)}</span>
        <b class="report-status-chip ${escapeHtml(report.status || 'open')}">${escapeHtml(formatReportStatus(report.status))}</b>
      </button>
    `;
  }

  function renderReportedQuestionInspector(report) {
    if (!report) return '<p class="empty-report">Choose a report to review it.</p>';
    const choices = Array.isArray(report.choices) ? report.choices : [];
    const explanation = report.explanation || {};
    return `
      <div class="inspector-section">
        <span class="quest-kicker">Reported Question</span>
        <h3>${escapeHtml(report.question || '')}</h3>
        <button class="btn btn-secondary full-question-inline-btn" type="button" data-full-question-source="report" data-full-question-report-id="${escapeHtml(report.id)}">See full question</button>
        <div class="answer-comparison">
          <div>
            <span>Student selected</span>
            <strong>${escapeHtml(report.selectedChoice || 'Not answered yet')}</strong>
          </div>
          <div>
            <span>Marked correct</span>
            <strong>${escapeHtml(report.correctChoice || '')}</strong>
          </div>
        </div>
        <dl class="answer-meta">
          <div><dt>Reason</dt><dd>${escapeHtml(formatReportReason(report.reason))}</dd></div>
          <div><dt>Status</dt><dd>${escapeHtml(formatReportStatus(report.status))}</dd></div>
          <div><dt>Reported</dt><dd>${formatDate(report.createdAt)}</dd></div>
          <div><dt>Topic</dt><dd>${escapeHtml(report.title || report.topic || '')}</dd></div>
          <div><dt>Level</dt><dd>${escapeHtml(`Grade ${report.grade || ''} · ${titleCase(report.difficulty || '')}`)}</dd></div>
        </dl>
        ${report.note ? `<div class="report-note"><span>Student note</span><p>${escapeHtml(report.note)}</p></div>` : ''}
      </div>
      <div class="inspector-section">
        <h3>Answer Choices</h3>
        <div class="reported-choice-list">
          ${choices.map((choice, index) => `
            <div class="reported-choice ${index === report.correctIndex ? 'correct' : ''} ${index === report.selectedIndex ? 'selected' : ''}">
              <strong>${String.fromCharCode(65 + index)}) ${escapeHtml(choice)}</strong>
              <span>${index === report.correctIndex ? 'Marked correct' : index === report.selectedIndex ? 'Student selected' : ''}</span>
            </div>
          `).join('') || '<p class="empty-report">No choices saved with this report.</p>'}
        </div>
        ${explanation.correct ? `<div class="report-note"><span>Correct explanation</span><p>${escapeHtml(explanation.correct)}</p></div>` : ''}
      </div>
      <div class="inspector-section">
        <h3>Grown-up Review</h3>
        <label class="report-review-field">
          <span>Status</span>
          <select data-report-review-status>
            ${['open', 'reviewing', 'resolved', 'dismissed'].map(status => `<option value="${status}" ${status === (report.status || 'open') ? 'selected' : ''}>${escapeHtml(formatReportStatus(status))}</option>`).join('')}
          </select>
        </label>
        <label class="report-review-field">
          <span>Review note</span>
          <textarea data-report-review-note rows="4" maxlength="800">${escapeHtml(report.grownupNote || '')}</textarea>
        </label>
        <p class="report-review-message" data-report-review-message></p>
        <button class="btn btn-primary" type="button" data-save-report-review>Save review</button>
        ${report.pageUrl ? `<a class="btn btn-secondary" href="${escapeHtml(report.pageUrl)}" target="_blank" rel="noopener">Open question page</a>` : ''}
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
          lastMissedAt: '',
          latestAttempt: null,
          latestMissedAttempt: null
        };
      }
      questions[key].attempts += 1;
      if (!questions[key].latestAttempt || String(attempt.session?.completedAt || attempt.completedAt || '').localeCompare(String(questions[key].latestAttempt.session?.completedAt || questions[key].latestAttempt.completedAt || '')) > 0) {
        questions[key].latestAttempt = attempt;
      }
      if (!attempt.correct) {
        questions[key].misses += 1;
        questions[key].lastMissedAt = attempt.session?.completedAt || attempt.completedAt || '';
        questions[key].latestMissedAttempt = attempt;
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

  function bindFullQuestionTriggers(root, student) {
    root.querySelectorAll('[data-full-question-source]').forEach(trigger => {
      trigger.addEventListener('click', event => {
        event.stopPropagation();
        const detail = getFullQuestionDetail(student, trigger);
        if (detail) openFullQuestionModal(detail);
      });
    });
  }

  function getFullQuestionDetail(student, trigger) {
    const source = trigger.dataset.fullQuestionSource;
    if (source === 'report') {
      const reportId = trigger.dataset.fullQuestionReportId || trigger.dataset.reportId || state.selectedReportId;
      const report = (student.reportedQuestions || []).find(item => item.id === reportId);
      return report ? normalizeFullQuestionDetail(report, {
        sourceLabel: 'Reported Question',
        metaLabel: `${formatReportReason(report.reason)} · ${formatReportStatus(report.status)} · ${formatDate(report.createdAt)}`,
        studentName: student.name
      }) : null;
    }

    const questionId = trigger.dataset.questionId || state.selectedQuestionId;
    const attempts = student.sessions.flatMap(session => (session.attempts || []).map(attempt => Object.assign({ session }, attempt)));
    const risk = (student.questionRisks || []).find(item => item.id === questionId);
    const attempt = source === 'risk'
      ? (risk && (risk.latestMissedAttempt || risk.latestAttempt)) || attempts.find(item => item.id === questionId)
      : attempts.find(item => item.id === questionId);
    return attempt ? normalizeFullQuestionDetail(attempt, {
      sourceLabel: source === 'risk' ? 'Question to Revisit' : 'Practice Question',
      metaLabel: `${attempt.correct ? 'Answered correctly' : 'Missed'} · ${attempt.subtopicTitle || 'Mixed practice'} · ${formatDate(attempt.session?.completedAt || attempt.completedAt)}`,
      studentName: student.name
    }) : null;
  }

  function normalizeFullQuestionDetail(item, context) {
    const choices = Array.isArray(item.choices) ? item.choices : [];
    const selectedIndex = Number.isFinite(item.selectedIndex) ? item.selectedIndex : choices.indexOf(item.selectedChoice);
    const correctIndex = Number.isFinite(item.correctIndex) ? item.correctIndex : choices.indexOf(item.correctChoice);
    return {
      id: item.id || item.questionId || '',
      sourceLabel: context.sourceLabel,
      metaLabel: context.metaLabel,
      studentName: context.studentName,
      question: item.question || '',
      choices,
      selectedIndex,
      selectedChoice: choices[selectedIndex] || item.selectedChoice || '',
      correctIndex,
      correctChoice: choices[correctIndex] || item.correctChoice || '',
      explanation: item.explanation || null,
      studyAid: item.studyAid || null,
      visualScene: item.visualScene || null,
      spelling: item.spelling || null,
      correct: typeof item.correct === 'boolean' ? item.correct : selectedIndex >= 0 && selectedIndex === correctIndex,
      topic: item.title || item.topic || item.subtopicTitle || '',
      grade: item.grade || '',
      difficulty: item.difficulty || '',
      skills: Array.isArray(item.skills) ? item.skills : [],
      note: item.note || ''
    };
  }

  function openFullQuestionModal(detail) {
    closeFullQuestionModal();
    state.fullQuestion = detail;
    const modal = document.createElement('div');
    modal.className = 'full-question-modal-backdrop';
    modal.setAttribute('data-full-question-modal', '');
    modal.innerHTML = renderFullQuestionModal(detail);
    document.body.appendChild(modal);
    document.body.classList.add('modal-open');
    modal.querySelector('[data-close-full-question]')?.focus();
    modal.addEventListener('click', event => {
      if (event.target === modal || event.target.closest('[data-close-full-question]')) closeFullQuestionModal();
    });
    bindFullQuestionPronunciationControls(modal, detail);
    document.addEventListener('keydown', handleFullQuestionKeydown);
  }

  function closeFullQuestionModal() {
    document.querySelectorAll('[data-full-question-modal]').forEach(modal => modal.remove());
    document.body.classList.remove('modal-open');
    document.removeEventListener('keydown', handleFullQuestionKeydown);
    state.fullQuestion = null;
  }

  function handleFullQuestionKeydown(event) {
    if (event.key === 'Escape') closeFullQuestionModal();
  }

  function renderFullQuestionModal(detail) {
    return `
      <section class="full-question-modal" role="dialog" aria-modal="true" aria-labelledby="full-question-title">
        <div class="full-question-modal-header">
          <div>
            <span class="quest-kicker">${escapeHtml(detail.sourceLabel)}</span>
            <h2 id="full-question-title">Full Question View</h2>
            <p>${escapeHtml(detail.studentName)} · ${escapeHtml(detail.metaLabel)}</p>
          </div>
          <button class="modal-close-btn" type="button" data-close-full-question aria-label="Close full question">×</button>
        </div>
        <div class="full-question-modal-body">
          ${renderFullQuestionStudentView(detail)}
          ${renderFullQuestionEvidence(detail)}
        </div>
      </section>
    `;
  }

  function renderFullQuestionStudentView(detail) {
    return `
      <div class="question-box full-question-student-view">
        ${renderFullQuestionPronunciationControls(detail)}
        ${renderQuestionPromptForReport(detail)}
        <div class="choices">
          ${detail.choices.map((choice, index) => {
            const isSelected = index === detail.selectedIndex;
            const isCorrect = index === detail.correctIndex;
            const classes = [
              'choice-btn',
              isCorrect ? 'correct' : '',
              isSelected && !isCorrect ? 'incorrect' : '',
              !isSelected && !isCorrect ? 'unselected-wrong' : ''
            ].filter(Boolean).join(' ');
            const status = isCorrect ? 'Correct answer' : isSelected ? 'Student selected' : '';
            return `
              <div class="${classes}">
                <span class="choice-letter">${String.fromCharCode(65 + index)}</span>
                <span>${escapeHtml(choice)}${status ? `<em>${escapeHtml(status)}</em>` : ''}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  function renderFullQuestionEvidence(detail) {
    const selectedExplanation = getSelectedExplanation(detail);
    const explanationRows = renderFullQuestionExplanations(detail);
    return `
      <div class="full-question-evidence">
        <section class="inspector-section">
          <h3>Answer Record</h3>
          <div class="answer-comparison">
            <div>
              <span>Student chose</span>
              <strong>${escapeHtml(detail.selectedChoice || 'No answer')}</strong>
            </div>
            <div>
              <span>Correct answer</span>
              <strong>${escapeHtml(detail.correctChoice || 'Not saved')}</strong>
            </div>
          </div>
          <dl class="answer-meta">
            <div><dt>Result</dt><dd>${detail.correct ? 'Right' : 'Missed'}</dd></div>
            <div><dt>Topic</dt><dd>${escapeHtml(detail.topic || 'Mixed practice')}</dd></div>
            <div><dt>Level</dt><dd>${escapeHtml([detail.grade ? `Grade ${detail.grade}` : '', titleCase(detail.difficulty || '')].filter(Boolean).join(' · ') || 'Not saved')}</dd></div>
            <div><dt>Skill</dt><dd>${escapeHtml(detail.skills.map(titleCase).join(', ') || 'Not saved')}</dd></div>
          </dl>
          ${detail.note ? `<div class="report-note"><span>Student note</span><p>${escapeHtml(detail.note)}</p></div>` : ''}
        </section>
        <section class="inspector-section">
          <h3>Explanation Shown</h3>
          ${selectedExplanation ? `<div class="report-note"><span>For the selected answer</span><p>${escapeHtml(selectedExplanation)}</p></div>` : '<p class="empty-report">No explanation was saved with this older record.</p>'}
          ${explanationRows}
          ${renderStudyAidForReport(detail.studyAid)}
        </section>
      </div>
    `;
  }

  function renderQuestionPromptForReport(detail) {
    if (detail.visualScene && detail.visualScene.type === 'dialogue-scene') {
      return renderSavedVisualQuestionScene(detail.visualScene, detail);
    }
    return renderDisplayPromptForReport(getDisplayPromptParts(detail.question), 'question');
  }

  function renderFullQuestionPronunciationControls(detail) {
    if (!getFullQuestionSpellingWord(detail)) return '';
    return `
      <div class="spelling-listen-row full-question-spelling-listen-row">
        <button class="btn btn-primary" type="button" data-full-question-speak="word">Play Word</button>
        <button class="btn btn-secondary" type="button" data-full-question-speak="slow">Play Slowly</button>
        <button class="btn btn-secondary" type="button" data-full-question-speak="clue">Play Clue</button>
      </div>
    `;
  }

  function bindFullQuestionPronunciationControls(root, detail) {
    root.querySelectorAll('[data-full-question-speak]').forEach(button => {
      button.addEventListener('click', () => {
        speakFullQuestionSpelling(detail, button.dataset.fullQuestionSpeak);
      });
    });
  }

  function speakFullQuestionSpelling(detail, mode) {
    if (!('speechSynthesis' in window)) return;
    const spelling = detail.spelling || {};
    const word = getFullQuestionSpellingWord(detail);
    if (!word) return;
    if (mode === 'clue') {
      const clue = spelling.clue || detail.question || '';
      const sentence = spelling.sentence ? ` ${String(spelling.sentence).replace('____', 'blank')}` : '';
      speakFullQuestionText(`${clue}.${sentence}`);
      return;
    }
    if (mode === 'slow') {
      speakFullQuestionWordSlowly(detail);
      return;
    }
    speakFullQuestionText(spelling.pronunciation || word);
  }

  function speakFullQuestionWordSlowly(detail) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const spelling = detail.spelling || {};
    const word = getFullQuestionSpellingWord(detail);
    const speech = spelling.pronunciation || word;
    const syllables = getFullQuestionPronunciationSyllables(detail);
    const utterances = [createFullQuestionUtterance(speech, { rate: 0.56, pitch: 1.02 })];
    if (syllables.length > 1) {
      syllables.forEach((syllable, index) => {
        utterances.push(createFullQuestionUtterance(syllable, {
          rate: 0.5,
          pitch: index === 0 ? 1.12 : 0.98,
          volume: index === 0 ? 1 : 0.82
        }));
      });
      utterances.push(createFullQuestionUtterance(speech, { rate: 0.62, pitch: 1.04 }));
    }
    utterances.forEach(utterance => window.speechSynthesis.speak(utterance));
  }

  function speakFullQuestionText(text, options) {
    if (!('speechSynthesis' in window)) return;
    const value = String(text || '').trim();
    if (!value) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(createFullQuestionUtterance(value, options || {}));
  }

  function createFullQuestionUtterance(text, options) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    const voice = getFullQuestionSpeechVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = options.rate || 0.78;
    utterance.pitch = options.pitch || 1.04;
    utterance.volume = options.volume || 1;
    return utterance;
  }

  function getFullQuestionSpeechVoice() {
    if (preferredFullQuestionSpeechVoice) return preferredFullQuestionSpeechVoice;
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    preferredFullQuestionSpeechVoice = voices
      .filter(voice => /^en(-|_)?/i.test(voice.lang || ''))
      .sort((a, b) => scoreFullQuestionSpeechVoice(b) - scoreFullQuestionSpeechVoice(a))[0] || null;
    return preferredFullQuestionSpeechVoice;
  }

  function scoreFullQuestionSpeechVoice(voice) {
    const name = `${voice.name || ''} ${voice.voiceURI || ''}`.toLowerCase();
    const lang = String(voice.lang || '').toLowerCase();
    let score = 0;
    if (lang === 'en-us') score += 80;
    else if (lang.startsWith('en-us')) score += 70;
    else if (lang.startsWith('en')) score += 35;
    if (voice.default) score += 5;
    if (/samantha|ava|allison|zoe|karen|moira|tessa|victoria|google us english|microsoft (aria|jenny|guy)|natural|premium|enhanced/.test(name)) score += 20;
    if (/compact|novelty|whisper|zarvox|bells|boing|bubbles|cellos|deranged|hysterical|trinoids/.test(name)) score -= 80;
    return score;
  }

  function getFullQuestionPronunciationSyllables(detail) {
    const spelling = detail.spelling || {};
    const dataSlow = Array.isArray(spelling.pronunciationSyllables) ? spelling.pronunciationSyllables : null;
    const syllables = dataSlow || String(spelling.syllables || getFullQuestionSpellingWord(detail)).split('-');
    return syllables.map(part => String(part || '').trim()).filter(Boolean);
  }

  function getFullQuestionSpellingWord(detail) {
    const spelling = detail && detail.spelling;
    if (!spelling) return '';
    return String(spelling.word || detail.correctChoice || '').trim();
  }

  function renderSavedVisualQuestionScene(scene, detail) {
    const prompt = getDisplayPromptParts(scene.prompt || detail.question);
    const dialogue = Array.isArray(scene.dialogue) ? scene.dialogue.slice(0, 2) : [];
    return `
      <section class="visual-question-scene visual-scene-${escapeHtml(scene.setting || 'classroom')}" aria-label="${escapeHtml(scene.title || 'Illustrated question scene')}">
        <div class="visual-scene-intro">
          <h3>${escapeHtml(scene.title || 'Question Scene')}</h3>
        </div>
        ${renderDisplayPromptForReport(prompt, 'visual')}
        ${dialogue.length ? `
          <div class="visual-dialogue-strip full-question-dialogue">
            ${dialogue.map(entry => `
              <div class="visual-speech-bubble">
                <span>${escapeHtml(entry.speaker || entry.characterName || 'Character')}</span>
                <p>${escapeHtml(entry.text || '')}</p>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </section>
    `;
  }

  function getDisplayPromptParts(value) {
    const fullText = normalizePromptText(value);
    const withoutLeadIn = stripPromptLeadIns(fullText);
    const passageMatch = withoutLeadIn.match(/^Read the passage\.\s*(?:Grade\s+\d+\s+[a-z-]+\s+passage:\s*)?([\s\S]+)$/i);
    const passageSource = passageMatch ? passageMatch[1].trim() : withoutLeadIn;
    const split = passageSource.split(/\n\s*\n/);
    if (passageMatch && split.length > 1) {
      const task = stripPromptLeadIns(split.slice(1).join('\n\n')).trim();
      const passageParts = split[0].trim().split(/(?<=[.!?])\s+/).filter(Boolean);
      return {
        type: 'passage',
        fullText: [passageParts.join(' '), task].filter(Boolean).join(' '),
        passage: passageParts.join(' '),
        annotation: '',
        task
      };
    }
    return {
      type: 'plain',
      fullText: withoutLeadIn,
      passage: '',
      annotation: '',
      task: withoutLeadIn
    };
  }

  function renderDisplayPromptForReport(prompt, variant) {
    if (!prompt || !prompt.fullText) return '';
    if (prompt.type !== 'passage') {
      return `<div class="${variant}-prompt-card ${variant}-prompt-card-plain"><div class="question-text">${escapeHtml(prompt.task || prompt.fullText)}</div></div>`;
    }
    return `
      <div class="${variant}-prompt-card ${variant}-prompt-card-passage">
        <div class="prompt-passage">
          <span>Passage</span>
          <p>${escapeHtml(prompt.passage)}</p>
        </div>
        <div class="prompt-task">
          <span>Question</span>
          <strong>${escapeHtml(prompt.task)}</strong>
        </div>
      </div>
    `;
  }

  function renderFullQuestionExplanations(detail) {
    const explanation = detail.explanation || {};
    if (!explanation.correct && !Array.isArray(explanation.incorrect)) return '';
    return `
      <div class="choice-explanations full-question-explanations">
        ${detail.choices.map((choice, index) => {
          const isCorrect = index === detail.correctIndex;
          const text = isCorrect ? explanation.correct : (explanation.incorrect && explanation.incorrect[index]);
          if (!text) return '';
          return `
            <div class="choice-explanation ${isCorrect ? 'correct-exp' : 'incorrect-exp'}">
              <strong>${String.fromCharCode(65 + index)})</strong> ${escapeHtml(cleanExplanationText(text, detail))}
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderStudyAidForReport(studyAid) {
    if (!studyAid) return '';
    return [
      studyAid.definition ? `<div class="report-note"><span>Study tip</span><p>${escapeHtml(studyAid.definition)}</p></div>` : '',
      studyAid.example ? `<div class="report-note"><span>Example</span><p>${escapeHtml(studyAid.example)}</p></div>` : ''
    ].filter(Boolean).join('');
  }

  function getSelectedExplanation(detail) {
    const explanation = detail.explanation || {};
    if (detail.selectedIndex === detail.correctIndex) return cleanExplanationText(explanation.correct || '', detail);
    return cleanExplanationText(explanation.incorrect && explanation.incorrect[detail.selectedIndex] || '', detail);
  }

  function cleanExplanationText(text, detail) {
    const value = String(text || '').trim();
    const correctChoice = detail.correctChoice || '';
    if (!value || !correctChoice) return value;
    return value.replace(new RegExp(`^CORRECT:\\s*${escapeRegExp(correctChoice)}\\.?\\s*`, 'i'), '').trim();
  }

  function normalizePromptText(value) {
    return String(value || '').replace(/\s+\n/g, '\n').replace(/\n\s+/g, '\n').trim();
  }

  function stripPromptLeadIns(value) {
    return String(value || '').replace(/^(?:Question\s*\d+\s*[:.)-]\s*)/i, '').trim();
  }

  function escapeRegExp(text) {
    return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
      explanation: {
        correct: `Answer: ${def[1][def[2]]}. This choice matches the skill for ${title}.`,
        incorrect: def[1].map((choice, choiceIndex) => choiceIndex === def[2] ? '' : `Not: ${choice}. This choice does not match the key clue.`)
      },
      studyAid: {
        definition: `Look for the exact clue that matches ${title}.`,
        example: `Eliminate choices that do not fit the wording of the question.`
      },
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

  async function saveQuestionReportReview(studentId, reportId, updates) {
    const auth = window.GrammarQuestAuth;
    const authState = await getAuthState();
    if (authState.parentMode && auth && typeof auth.updateStudentQuestionReport === 'function') {
      await auth.updateStudentQuestionReport(studentId, reportId, updates);
      return;
    }
    const progress = loadProgress();
    const reports = progress.reports || {};
    const questionReports = Array.isArray(reports.questionReports) ? reports.questionReports : [];
    const now = new Date().toISOString();
    reports.questionReports = questionReports.map(report => {
      if (!report || report.id !== reportId) return report;
      return Object.assign({}, report, {
        status: normalizeReportStatus(updates && updates.status),
        grownupNote: String(updates && updates.grownupNote || '').trim().slice(0, 800),
        reviewedAt: now,
        updatedAt: now
      });
    });
    progress.reports = reports;
    if (window.GrammarQuestProgress && typeof window.GrammarQuestProgress.saveLocalProgress === 'function') {
      window.GrammarQuestProgress.saveLocalProgress(progress, { sync: true });
    } else {
      localStorage.setItem('grammarQuestProgress', JSON.stringify(progress));
    }
  }

  function formatReportReason(value) {
    const reason = String(value || '').toLowerCase();
    if (reason === 'typo') return 'Typo or wording';
    if (reason === 'audio_visual') return 'Picture or layout';
    if (reason === 'other') return 'Other';
    return 'Answer or explanation';
  }

  function formatReportStatus(value) {
    const status = normalizeReportStatus(value);
    if (status === 'reviewing') return 'Reviewing';
    if (status === 'resolved') return 'Resolved';
    if (status === 'dismissed') return 'Dismissed';
    return 'Open';
  }

  function normalizeReportStatus(value) {
    const status = String(value || '').toLowerCase();
    return ['open', 'reviewing', 'resolved', 'dismissed'].includes(status) ? status : 'open';
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

  function formatSeconds(seconds) {
    const value = Number(seconds) || 0;
    if (!value) return 'Not recorded';
    if (value < 60) return `${Math.round(value)}s`;
    const minutes = Math.floor(value / 60);
    const remainder = Math.round(value % 60);
    return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
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
