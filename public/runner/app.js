class RespondentApiClient {
  #baseUrl;

  constructor(baseUrl = '/api/surveys') {
    this.#baseUrl = baseUrl;
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
    if (!toast) return;
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
  #portalStage;
  #errorStage;
  #errorMessage;
  #responseStage;
  #successStage;
  #closedStage;
  #votedStage;
  #responseForm;
  #currentSurvey;
  #progressText;
  #progressFill;
  #submitButton;

  constructor() {
    this.#apiClient = new RespondentApiClient();
    this.#portalStage = document.getElementById('survey-portal-stage');
    this.#errorStage = document.getElementById('survey-error-stage');
    this.#errorMessage = document.getElementById('survey-error-message');
    this.#responseStage = document.getElementById('survey-response-stage');
    this.#successStage = document.getElementById('survey-success-stage');
    this.#closedStage = document.getElementById('survey-closed-stage');
    this.#votedStage = document.getElementById('survey-voted-stage');
    this.#responseForm = document.getElementById('response-form');
    this.#progressText = document.getElementById('survey-progress-text');
    this.#progressFill = document.getElementById('survey-progress-fill');
    this.#submitButton = document.getElementById('btn-submit-response');

    this.init();
  }

  init() {
    if (this.#responseForm) {
      this.#responseForm.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    window.addEventListener('keydown', (e) => this.handleGlobalKey(e));

    const urlParams = new URLSearchParams(window.location.search);
    const targetSurveyId = urlParams.get('survey') || urlParams.get('id');
    if (targetSurveyId) {
      this.openSurvey(targetSurveyId);
    } else {
      this.showPortalStage();
    }
  }

  #hideAllStages() {
    if (this.#portalStage) this.#portalStage.classList.add('hidden');
    if (this.#errorStage) this.#errorStage.classList.add('hidden');
    if (this.#responseStage) this.#responseStage.classList.add('hidden');
    if (this.#successStage) this.#successStage.classList.add('hidden');
    if (this.#closedStage) this.#closedStage.classList.add('hidden');
    if (this.#votedStage) this.#votedStage.classList.add('hidden');
  }

  showPortalStage() {
    this.#hideAllStages();
    if (this.#portalStage) this.#portalStage.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  showErrorStage(message) {
    this.#hideAllStages();
    if (this.#errorMessage && message) {
      this.#errorMessage.textContent = message;
    }
    if (this.#errorStage) this.#errorStage.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  showClosedStage() {
    this.#hideAllStages();
    if (this.#closedStage) this.#closedStage.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  showVotedStage() {
    this.#hideAllStages();
    if (this.#votedStage) this.#votedStage.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      this.showErrorStage(error.message);
    }
  }

  renderResponseStage(survey) {
    document.getElementById('current-survey-title').textContent = survey.title;
    document.getElementById('current-survey-description').textContent = survey.description || '';
    const nameInput = document.getElementById('participant-name-input');
    if (nameInput) nameInput.value = '';

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
              <div class="ranking-drag-handle" title="Glisser pour déplacer">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>
              </div>
              <div class="ranking-runner-badge">${idx + 1}</div>
              <div class="ranking-runner-text">${this.escapeHtml(opt.text)}</div>
              <div class="ranking-runner-actions">
                <button type="button" class="btn-ranking-move btn-move-up" title="Monter" ${idx === 0 ? 'disabled' : ''} aria-label="Monter">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg>
                </button>
                <button type="button" class="btn-ranking-move btn-move-down" title="Descendre" ${idx === options.length - 1 ? 'disabled' : ''} aria-label="Descendre">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                </button>
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
              <span class="ranking-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="7 10 12 5 17 10"/><polyline points="17 14 12 19 7 14"/></svg></span> Glissez-déposez ou utilisez les flèches pour classer par priorité :
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
            (opt) => `
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
            (opt) => `
            <label class="choice-option-item choice-checkbox-item">
              <input type="checkbox" name="q_${question.id}" value="${opt.id}" data-text="${this.escapeHtml(opt.text)}">
              <span class="choice-indicator choice-checkbox-indicator">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </span>
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
    this.#hideAllStages();
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
    const participantName = participantNameInput?.value.trim() || 'Anonyme';

    try {
      this.#submitButton.disabled = true;
      this.#submitButton.textContent = 'Envoi en cours...';

      await this.#apiClient.submitResponse(this.#currentSurvey.id, {
        participantName,
        answers,
      });

      localStorage.setItem(`survey_${this.#currentSurvey.id}_voted`, 'true');

      this.#hideAllStages();
      this.#successStage.classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      ToastNotification.show(error.message, false);
      this.#submitButton.disabled = false;
      this.updateProgress();
    }
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
