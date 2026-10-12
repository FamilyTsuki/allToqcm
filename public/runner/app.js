class RespondentApiClient {
  #baseUrl;

  constructor(baseUrl = '/api/surveys') {
    this.#baseUrl = baseUrl;
  }

  async fetchSurveys() {
    const response = await fetch(this.#baseUrl);
    if (!response.ok) {
      throw new Error('Erreur lors du chargement des questionnaires');
    }
    return response.json();
  }

  async fetchSurvey(id) {
    const response = await fetch(`${this.#baseUrl}/${id}`);
    if (!response.ok) {
      throw new Error('Erreur lors du chargement du questionnaire');
    }
    return response.json();
  }

  async submitResponse(surveyId, payload) {
    const response = await fetch(`${this.#baseUrl}/${surveyId}/responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Erreur lors de la soumission');
    }
    return response.json();
  }
}

class ToastNotification {
  static show(message, isSuccess = true) {
    const toast = document.getElementById('notification-toast');
    toast.textContent = message;
    toast.className = `toast ${isSuccess ? 'success' : 'error'}`;
    toast.classList.remove('hidden');

    setTimeout(() => {
      toast.classList.add('hidden');
    }, 3000);
  }
}

class RespondentApp {
  #apiClient;
  #surveysListContainer;
  #selectionStage;
  #responseStage;
  #successStage;
  #closedStage;
  #votedStage;
  #refreshButton;
  #backButton;
  #restartButton;
  #closedBackButton;
  #votedBackButton;
  #votedRevoteButton;
  #responseForm;
  #currentSurvey;
  #progressText;
  #progressFill;
  #submitButton;

  constructor() {
    this.#apiClient = new RespondentApiClient();
    this.#surveysListContainer = document.getElementById('available-surveys-list');
    this.#selectionStage = document.getElementById('survey-selection-stage');
    this.#responseStage = document.getElementById('survey-response-stage');
    this.#successStage = document.getElementById('survey-success-stage');
    this.#closedStage = document.getElementById('survey-closed-stage');
    this.#votedStage = document.getElementById('survey-voted-stage');
    this.#refreshButton = document.getElementById('btn-refresh-surveys');
    this.#backButton = document.getElementById('btn-back-to-list');
    this.#restartButton = document.getElementById('btn-restart');
    this.#closedBackButton = document.getElementById('btn-closed-back');
    this.#votedBackButton = document.getElementById('btn-voted-back');
    this.#votedRevoteButton = document.getElementById('btn-voted-revote');
    this.#responseForm = document.getElementById('response-form');
    this.#progressText = document.getElementById('survey-progress-text');
    this.#progressFill = document.getElementById('survey-progress-fill');
    this.#submitButton = document.getElementById('btn-submit-response');

    this.init();
  }

  init() {
    this.#refreshButton.addEventListener('click', () => this.loadSurveys());
    this.#backButton.addEventListener('click', () => this.showSelectionStage());
    this.#restartButton.addEventListener('click', () => this.showSelectionStage());
    this.#closedBackButton.addEventListener('click', () => this.showSelectionStage());
    this.#votedBackButton.addEventListener('click', () => this.showSelectionStage());
    this.#votedRevoteButton.addEventListener('click', () => {
      if (this.#currentSurvey) {
        localStorage.removeItem(`survey_${this.#currentSurvey.id}_voted`);
        this.renderResponseStage(this.#currentSurvey);
      }
    });
    this.#responseForm.addEventListener('submit', (e) => this.handleSubmit(e));

    window.addEventListener('keydown', (e) => this.handleGlobalKey(e));

    const urlParams = new URLSearchParams(window.location.search);
    const targetSurveyId = urlParams.get('survey') || urlParams.get('id');
    if (targetSurveyId) {
      this.openSurvey(targetSurveyId);
    } else {
      this.loadSurveys();
    }
  }

  async loadSurveys() {
    this.#surveysListContainer.innerHTML =
      '<p class="empty-card">Chargement des questionnaires...</p>';
    try {
      const surveys = await this.#apiClient.fetchSurveys();
      this.renderSurveysGrid(surveys);
    } catch (error) {
      this.#surveysListContainer.innerHTML = `<p class="empty-card">${error.message}</p>`;
    }
  }

  renderSurveysGrid(surveys) {
    this.#surveysListContainer.innerHTML = '';

    if (!Array.isArray(surveys) || surveys.length === 0) {
      this.#surveysListContainer.innerHTML =
        '<div class="empty-card"><p>Aucun questionnaire disponible actuellement.</p></div>';
      return;
    }

    for (const survey of surveys) {
      const card = document.createElement('div');
      card.className = `survey-card ${survey.isClosed ? 'is-closed' : ''}`;

      const descHtml = survey.description
        ? `<p class="survey-card-desc">${this.escapeHtml(survey.description)}</p>`
        : '';
      const qCount = survey.questions?.length ?? survey.questionCount ?? 0;
      const qCountText = `${qCount} question${qCount > 1 ? 's' : ''}`;
      const hasVoted = localStorage.getItem(`survey_${survey.id}_voted`) === 'true';

      let statusBadge = '';
      if (survey.isClosed) {
        statusBadge = '<span class="badge-status status-closed">Clôturé</span>';
      } else if (hasVoted) {
        statusBadge = '<span class="badge-status status-voted">Déjà répondu</span>';
      }

      card.innerHTML = `
        <div class="survey-card-info">
          <div class="survey-card-title-row">
            <h3>${this.escapeHtml(survey.title)}</h3>
            ${statusBadge}
          </div>
          ${descHtml}
          <span class="survey-card-meta">${qCountText}</span>
        </div>
        <button class="btn btn-secondary btn-sm btn-participate" ${survey.isClosed ? 'disabled' : ''}>
          ${survey.isClosed ? 'Fermé' : hasVoted ? 'Revoir &rarr;' : 'Répondre &rarr;'}
        </button>
      `;

      card.querySelector('.btn-participate').addEventListener('click', () => {
        this.openSurvey(survey.id);
      });

      this.#surveysListContainer.appendChild(card);
    }
  }

  async openSurvey(surveyId) {
    try {
      this.#currentSurvey = await this.#apiClient.fetchSurvey(surveyId);
      if (this.#currentSurvey.isClosed) {
        this.showClosedStage();
        return;
      }
      const hasVoted = localStorage.getItem(`survey_${surveyId}_voted`) === 'true';
      if (hasVoted) {
        this.showVotedStage();
        return;
      }
      this.renderResponseStage(this.#currentSurvey);
    } catch (error) {
      ToastNotification.show(error.message, false);
      this.loadSurveys();
    }
  }

  showClosedStage() {
    this.#selectionStage.classList.add('hidden');
    this.#responseStage.classList.add('hidden');
    this.#successStage.classList.add('hidden');
    this.#votedStage.classList.add('hidden');
    this.#closedStage.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  showVotedStage() {
    this.#selectionStage.classList.add('hidden');
    this.#responseStage.classList.add('hidden');
    this.#successStage.classList.add('hidden');
    this.#closedStage.classList.add('hidden');
    this.#votedStage.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  renderResponseStage(survey) {
    document.getElementById('current-survey-title').textContent = survey.title;
    document.getElementById('current-survey-description').textContent = survey.description || '';
    document.getElementById('participant-name-input').value = '';

    const questionsContainer = document.getElementById('survey-questions-container');
    questionsContainer.innerHTML = '';

    const questions = Array.isArray(survey.questions) ? survey.questions : [];

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const card = document.createElement('div');
      card.className = 'question-runner-card';
      card.id = `card_q_${question.id}`;
      card.tabIndex = 0;

      const imageHtml = question.imageUrl
        ? `
        <div class="question-illustration-wrapper">
          <img src="${this.escapeHtml(question.imageUrl)}" class="question-illustration" alt="Illustration" loading="lazy" onerror="this.parentElement.style.display='none'" />
        </div>
      `
        : '';

      const isRanking = question.type === 'ranking';
      const options = Array.isArray(question.options) ? question.options : [];

      if (isRanking) {
        const rankingItemsHtml = options
          .map(
            (opt, idx) => `
            <div class="ranking-runner-item" draggable="true" data-option-id="${opt.id}">
              <div class="ranking-drag-handle" title="Glisser pour déplacer">⋮⋮</div>
              <div class="ranking-runner-badge">${idx + 1}</div>
              <div class="ranking-runner-text">${this.escapeHtml(opt.text)}</div>
              <div class="ranking-runner-actions">
                <button type="button" class="btn-ranking-move btn-move-up" title="Monter" ${idx === 0 ? 'disabled' : ''}>▲</button>
                <button type="button" class="btn-ranking-move btn-move-down" title="Descendre" ${idx === options.length - 1 ? 'disabled' : ''}>▼</button>
              </div>
            </div>
          `,
          )
          .join('');

        card.innerHTML = `
          <div class="question-runner-header">
            <h3><span class="q-num">${i + 1}.</span> ${this.escapeHtml(question.text)}</h3>
          </div>
          ${imageHtml}
          <div class="ranking-wrapper">
            <div class="ranking-help-text">
              <span class="ranking-icon">⇅</span> Glissez-déposez ou utilisez les flèches pour classer par priorité :
            </div>
            <div class="ranking-items-list" id="ranking_list_${question.id}" data-question-id="${question.id}">
              ${rankingItemsHtml}
            </div>
            <div class="scale-selected-hint active" id="hint_q_${question.id}">Ordre par priorité (1 = plus prioritaire)</div>
          </div>
        `;

        this.setupRankingQuestion(card, question);
      } else if (question.type === 'choice') {
        const choicesHtml = options
          .map(
            (opt, idx) => `
            <label class="choice-option-item">
              <input type="radio" name="q_${question.id}" value="${opt.id}" data-text="${this.escapeHtml(opt.text)}">
              <span class="choice-indicator choice-radio-indicator"></span>
              <span class="choice-option-text">${this.escapeHtml(opt.text)}</span>
            </label>
          `,
          )
          .join('');

        card.innerHTML = `
          <div class="question-runner-header">
            <h3><span class="q-num">${i + 1}.</span> ${this.escapeHtml(question.text)}</h3>
          </div>
          ${imageHtml}
          <div class="choice-wrapper">
            <div class="choice-options-list">
              ${choicesHtml}
            </div>
            <div class="scale-selected-hint" id="hint_q_${question.id}"></div>
          </div>
        `;

        const radios = card.querySelectorAll(`input[name="q_${question.id}"]`);
        const hint = card.querySelector(`#hint_q_${question.id}`);

        radios.forEach((radio) => {
          radio.addEventListener('change', () => {
            if (radio.checked) {
              hint.textContent = `Votre choix : ${radio.dataset.text}`;
              hint.classList.add('active');
              card.classList.remove('question-missing');
              this.updateProgress();

              if (i + 1 < questions.length) {
                const nextCard = document.getElementById(`card_q_${questions[i + 1].id}`);
                const nextChecked = nextCard?.querySelector('input:checked');
                if (nextCard && !nextChecked) {
                  setTimeout(() => {
                    nextCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }, 320);
                }
              }
            }
          });
        });
      } else if (question.type === 'multiple_choice') {
        const choicesHtml = options
          .map(
            (opt, idx) => `
            <label class="choice-option-item choice-checkbox-item">
              <input type="checkbox" name="q_${question.id}" value="${opt.id}" data-text="${this.escapeHtml(opt.text)}">
              <span class="choice-indicator choice-checkbox-indicator"></span>
              <span class="choice-option-text">${this.escapeHtml(opt.text)}</span>
            </label>
          `,
          )
          .join('');

        card.innerHTML = `
          <div class="question-runner-header">
            <h3><span class="q-num">${i + 1}.</span> ${this.escapeHtml(question.text)}</h3>
          </div>
          ${imageHtml}
          <div class="choice-wrapper">
            <div class="choice-options-list">
              ${choicesHtml}
            </div>
            <div class="scale-selected-hint" id="hint_q_${question.id}"></div>
          </div>
        `;

        const checkboxes = card.querySelectorAll(`input[name="q_${question.id}"]`);
        const hint = card.querySelector(`#hint_q_${question.id}`);

        checkboxes.forEach((cb) => {
          cb.addEventListener('change', () => {
            const checkedBoxes = card.querySelectorAll(`input[name="q_${question.id}"]:checked`);
            if (checkedBoxes.length > 0) {
              hint.textContent = `${checkedBoxes.length} choix sélectionné${checkedBoxes.length > 1 ? 's' : ''}`;
              hint.classList.add('active');
              card.classList.remove('question-missing');
            } else {
              hint.textContent = '';
              hint.classList.remove('active');
            }
            this.updateProgress();
          });
        });
      } else {
        const pointsHtml = options
          .map(
            (opt, idx) => `
            <label class="scale-point-item point-idx-${idx}">
              <input type="radio" name="q_${question.id}" value="${opt.id}" data-text="${this.escapeHtml(opt.text)}">
              <span class="scale-point-dot">${idx + 1}</span>
              <span class="scale-point-label">${this.escapeHtml(opt.text)}</span>
            </label>
          `,
          )
          .join('');

        card.innerHTML = `
          <div class="question-runner-header">
            <h3><span class="q-num">${i + 1}.</span> ${this.escapeHtml(question.text)}</h3>
          </div>
          ${imageHtml}
          <div class="scale-wrapper">
            <div class="scale-points-row">
              ${pointsHtml}
            </div>
            <div class="scale-selected-hint" id="hint_q_${question.id}"></div>
          </div>
        `;

        const radios = card.querySelectorAll(`input[name="q_${question.id}"]`);
        const hint = card.querySelector(`#hint_q_${question.id}`);

        radios.forEach((radio) => {
          radio.addEventListener('change', () => {
            if (radio.checked) {
              hint.textContent = `Votre choix : ${radio.dataset.text}`;
              hint.classList.add('active');
              card.classList.remove('question-missing');
              this.updateProgress();

              if (i + 1 < questions.length) {
                const nextCard = document.getElementById(`card_q_${questions[i + 1].id}`);
                const nextChecked = nextCard?.querySelector('input[type="radio"]:checked');
                if (nextCard && !nextChecked) {
                  setTimeout(() => {
                    nextCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }, 320);
                }
              }
            }
          });
        });
      }

      questionsContainer.appendChild(card);
    }

    this.updateProgress();

    this.#selectionStage.classList.add('hidden');
    this.#successStage.classList.add('hidden');
    this.#closedStage.classList.add('hidden');
    this.#votedStage.classList.add('hidden');
    this.#responseStage.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  setupRankingQuestion(card, question) {
    const list = card.querySelector(`#ranking_list_${question.id}`);
    const hint = card.querySelector(`#hint_q_${question.id}`);

    const updateBadgesAndButtons = () => {
      const items = Array.from(list.querySelectorAll('.ranking-runner-item'));
      items.forEach((item, idx) => {
        const badge = item.querySelector('.ranking-runner-badge');
        if (badge) badge.textContent = `${idx + 1}`;
        const btnUp = item.querySelector('.btn-move-up');
        const btnDown = item.querySelector('.btn-move-down');
        if (btnUp) btnUp.disabled = idx === 0;
        if (btnDown) btnDown.disabled = idx === items.length - 1;
      });
    };

    const notifyChange = () => {
      updateBadgesAndButtons();
      card.classList.remove('question-missing');
      if (hint) {
        hint.textContent = 'Ordre personnalisé enregistré ✓';
        hint.classList.add('active');
      }
      this.updateProgress();
    };

    list.addEventListener('click', (e) => {
      const btnUp = e.target.closest('.btn-move-up');
      const btnDown = e.target.closest('.btn-move-down');
      if (btnUp) {
        const item = btnUp.closest('.ranking-runner-item');
        const prev = item.previousElementSibling;
        if (prev) {
          list.insertBefore(item, prev);
          notifyChange();
        }
      } else if (btnDown) {
        const item = btnDown.closest('.ranking-runner-item');
        const next = item.nextElementSibling;
        if (next) {
          list.insertBefore(next, item);
          notifyChange();
        }
      }
    });

    let draggedItem = null;

    list.addEventListener('dragstart', (e) => {
      const item = e.target.closest('.ranking-runner-item');
      if (!item) return;
      draggedItem = item;
      item.classList.add('is-dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', item.dataset.optionId);
    });

    list.addEventListener('dragend', () => {
      if (draggedItem) {
        draggedItem.classList.remove('is-dragging');
      }
      draggedItem = null;
      notifyChange();
    });

    list.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (!draggedItem) return;

      const draggableElements = [
        ...list.querySelectorAll('.ranking-runner-item:not(.is-dragging)'),
      ];
      const afterElement = draggableElements.reduce(
        (closest, child) => {
          const box = child.getBoundingClientRect();
          const offset = e.clientY - box.top - box.height / 2;
          if (offset < 0 && offset > closest.offset) {
            return { offset, element: child };
          }
          return closest;
        },
        { offset: Number.NEGATIVE_INFINITY },
      ).element;

      if (!afterElement) {
        list.appendChild(draggedItem);
      } else {
        list.insertBefore(draggedItem, afterElement);
      }
    });

    updateBadgesAndButtons();
  }

  updateProgress() {
    const questions = Array.isArray(this.#currentSurvey?.questions)
      ? this.#currentSurvey.questions
      : [];
    const total = questions.length;
    if (total === 0) return;

    let answered = 0;
    for (const q of questions) {
      if (q.type === 'ranking') {
        const list = document.getElementById(`ranking_list_${q.id}`);
        if (list && list.children.length > 0) {
          answered++;
        }
      } else if (q.type === 'multiple_choice') {
        const checked = document.querySelectorAll(`input[name="q_${q.id}"]:checked`);
        if (checked.length > 0) {
          answered++;
        }
      } else {
        const checked = document.querySelector(`input[name="q_${q.id}"]:checked`);
        if (checked) {
          answered++;
        }
      }
    }

    const percent = Math.round((answered / total) * 100);
    if (this.#progressText) {
      this.#progressText.textContent = `${answered} sur ${total} question${total > 1 ? 's' : ''} répondue${answered > 1 ? 's' : ''}`;
    }
    if (this.#progressFill) {
      this.#progressFill.style.width = `${percent}%`;
    }

    if (this.#submitButton) {
      if (answered === total) {
        this.#submitButton.textContent = 'Terminer le questionnaire ✓';
        this.#submitButton.classList.add('ready');
      } else {
        this.#submitButton.textContent = `Terminer le questionnaire (${answered}/${total})`;
        this.#submitButton.classList.remove('ready');
      }
    }
  }

  handleGlobalKey(event) {
    if (this.#responseStage.classList.contains('hidden')) return;
    if (
      ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName) &&
      document.activeElement.type === 'text'
    ) {
      return;
    }

    const keyNum = parseInt(event.key, 10);
    if (keyNum >= 1 && keyNum <= 5) {
      const questions = Array.isArray(this.#currentSurvey?.questions)
        ? this.#currentSurvey.questions
        : [];
      let targetQ = questions.find(
        (q) =>
          (q.type === 'scale' || q.type === 'choice') &&
          !document.querySelector(`input[name="q_${q.id}"]:checked`),
      );
      if (!targetQ && questions.length > 0) {
        targetQ = questions.find((q) => q.type === 'scale' || q.type === 'choice');
      }

      if (targetQ) {
        const radios = document.querySelectorAll(`input[name="q_${targetQ.id}"]`);
        if (radios[keyNum - 1]) {
          radios[keyNum - 1].checked = true;
          radios[keyNum - 1].dispatchEvent(new Event('change'));
        }
      }
    }
  }

  async handleSubmit(event) {
    event.preventDefault();

    const questions = Array.isArray(this.#currentSurvey?.questions)
      ? this.#currentSurvey.questions
      : [];
    const answers = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (q.type === 'ranking') {
        const list = document.getElementById(`ranking_list_${q.id}`);
        const items = list ? Array.from(list.querySelectorAll('.ranking-runner-item')) : [];
        const selectedOptionIds = items.map((item) => item.dataset.optionId);
        if (selectedOptionIds.length === 0) {
          const card = document.getElementById(`card_q_${q.id}`);
          if (card) {
            card.classList.add('question-missing');
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          ToastNotification.show(`Veuillez classer les options de la question ${i + 1}`, false);
          return;
        }
        answers.push({
          questionId: q.id,
          selectedOptionIds,
        });
      } else if (q.type === 'multiple_choice') {
        const checked = document.querySelectorAll(`input[name="q_${q.id}"]:checked`);
        if (checked.length > 0) {
          answers.push({
            questionId: q.id,
            selectedOptionIds: Array.from(checked).map((cb) => cb.value),
          });
        } else {
          const card = document.getElementById(`card_q_${q.id}`);
          if (card) {
            card.classList.add('question-missing');
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          ToastNotification.show(
            `Veuillez sélectionner au moins un choix pour la question ${i + 1}`,
            false,
          );
          return;
        }
      } else {
        const selectedRadio = document.querySelector(`input[name="q_${q.id}"]:checked`);
        if (selectedRadio) {
          answers.push({
            questionId: q.id,
            selectedOptionIds: [selectedRadio.value],
          });
        } else {
          const card = document.getElementById(`card_q_${q.id}`);
          if (card) {
            card.classList.add('question-missing');
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          ToastNotification.show(`Veuillez répondre à la question ${i + 1}`, false);
          return;
        }
      }
    }

    const participantNameInput = document.getElementById('participant-name-input');
    const participantName = participantNameInput.value.trim() || 'Anonyme';

    try {
      this.#submitButton.disabled = true;
      this.#submitButton.textContent = 'Envoi en cours...';

      await this.#apiClient.submitResponse(this.#currentSurvey.id, {
        participantName,
        answers,
      });

      localStorage.setItem(`survey_${this.#currentSurvey.id}_voted`, 'true');

      this.#responseStage.classList.add('hidden');
      this.#closedStage.classList.add('hidden');
      this.#votedStage.classList.add('hidden');
      this.#successStage.classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      ToastNotification.show(error.message, false);
    } finally {
      this.#submitButton.disabled = false;
      this.updateProgress();
    }
  }

  showSelectionStage() {
    window.history.replaceState({}, '', window.location.pathname);
    this.#responseStage.classList.add('hidden');
    this.#successStage.classList.add('hidden');
    this.#closedStage.classList.add('hidden');
    this.#votedStage.classList.add('hidden');
    this.#selectionStage.classList.remove('hidden');
    this.loadSurveys();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

function setupThemeToggle() {
  const toggleBtn = document.getElementById('theme-toggle');
  if (!toggleBtn) return;
  toggleBtn.addEventListener('click', () => {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const next = isLight ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('alltoask_theme', next);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupThemeToggle();
  new RespondentApp();
});
