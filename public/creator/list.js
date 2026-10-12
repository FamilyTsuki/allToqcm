class CreatorApiClient {
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

  async deleteSurvey(id) {
    const response = await fetch(`${this.#baseUrl}/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Erreur lors de la suppression');
    }
  }

  async fetchStats(id) {
    const response = await fetch(`${this.#baseUrl}/${id}/stats`);
    if (!response.ok) {
      throw new Error('Erreur lors du chargement des résultats');
    }
    return response.json();
  }

  async fetchShare(id, color = '#000000', customUrl = null) {
    const urlParam = customUrl ? `&url=${encodeURIComponent(customUrl)}` : '';
    const response = await fetch(
      `${this.#baseUrl}/${id}/share?color=${encodeURIComponent(color)}${urlParam}`,
    );
    if (!response.ok) {
      throw new Error('Erreur lors du chargement des informations de partage');
    }
    return response.json();
  }

  async toggleSurveyStatus(id) {
    const response = await fetch(`${this.#baseUrl}/${id}/toggle-status`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Erreur lors du changement de statut');
    }
    return response.json();
  }

  async duplicateSurvey(id) {
    const response = await fetch(`${this.#baseUrl}/${id}/duplicate`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error('Erreur lors de la duplication');
    }
    return response.json();
  }

  async compareSurveys(idA, idB) {
    const response = await fetch(`${this.#baseUrl}/compare?a=${idA}&b=${idB}`);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Erreur lors de la comparaison');
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

class SurveyListApp {
  #apiClient;
  #surveysListContainer;
  #refreshButton;
  #statsModal;
  #closeStatsModalButton;
  #shareModal;
  #closeShareModalButton;
  #compareModal;
  #openCompareButton;
  #closeCompareModalButton;
  #runCompareButton;
  #selectSurveyA;
  #selectSurveyB;
  #compareResultsContainer;
  #statsQuestionsContainer;
  #currentShareSurveyId;
  #currentStatsData;

  constructor() {
    this.#apiClient = new CreatorApiClient();
    this.#surveysListContainer = document.getElementById('existing-surveys-list');
    this.#refreshButton = document.getElementById('btn-refresh-surveys');
    this.#statsModal = document.getElementById('stats-modal');
    this.#closeStatsModalButton = document.getElementById('btn-close-modal');
    this.#shareModal = document.getElementById('share-modal');
    this.#closeShareModalButton = document.getElementById('btn-close-share-modal');

    this.#compareModal = document.getElementById('compare-modal');
    this.#openCompareButton = document.getElementById('btn-open-compare');
    this.#closeCompareModalButton = document.getElementById('btn-close-compare-modal');
    this.#runCompareButton = document.getElementById('btn-run-compare');
    this.#selectSurveyA = document.getElementById('select-survey-a');
    this.#selectSurveyB = document.getElementById('select-survey-b');
    this.#compareResultsContainer = document.getElementById('compare-results-container');

    this.#statsQuestionsContainer = document.getElementById('stats-questions-container');

    this.init();
  }

  init() {
    this.#refreshButton.addEventListener('click', () => this.loadSurveys());
    this.#closeStatsModalButton.addEventListener('click', () => this.closeStatsModal());
    this.#closeShareModalButton.addEventListener('click', () => this.closeShareModal());

    this.#openCompareButton.addEventListener('click', () => this.openCompareModal());
    this.#closeCompareModalButton.addEventListener('click', () => this.closeCompareModal());
    this.#runCompareButton.addEventListener('click', () => this.runComparison());

    this.#statsModal.addEventListener('click', (e) => {
      if (e.target === this.#statsModal) {
        this.closeStatsModal();
      }
    });

    this.#shareModal.addEventListener('click', (e) => {
      if (e.target === this.#shareModal) {
        this.closeShareModal();
      }
    });

    this.#compareModal.addEventListener('click', (e) => {
      if (e.target === this.#compareModal) {
        this.closeCompareModal();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeStatsModal();
        this.closeShareModal();
        this.closeCompareModal();
      }
    });

    const colorChips = document.querySelectorAll('#qr-color-chips .qr-color-chip');
    colorChips.forEach((chip) => {
      chip.addEventListener('click', async () => {
        if (!this.#currentShareSurveyId) return;
        colorChips.forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        const color = chip.dataset.color;
        const urlInput = document.getElementById('share-url-input');
        const customUrl = urlInput ? urlInput.value.trim() : null;
        try {
          const share = await this.#apiClient.fetchShare(
            this.#currentShareSurveyId,
            color,
            customUrl,
          );
          document.getElementById('share-qr-image').src = share.qrCode;
          const downloadQrLink = document.getElementById('share-download-qr');
          if (downloadQrLink) {
            downloadQrLink.href = share.qrCode;
          }
        } catch (err) {
          ToastNotification.show(err.message, false);
        }
      });
    });

    this.loadSurveys();
  }

  async loadSurveys() {
    this.#surveysListContainer.innerHTML =
      '<p class="empty-card">Chargement des questionnaires...</p>';
    try {
      const surveys = await this.#apiClient.fetchSurveys();
      this.renderSurveys(surveys);
    } catch (error) {
      this.#surveysListContainer.innerHTML = `<p class="empty-card">${error.message}</p>`;
    }
  }

  renderSurveys(surveys) {
    this.#surveysListContainer.innerHTML = '';

    if (surveys.length === 0) {
      this.#surveysListContainer.innerHTML = `
        <div class="empty-card">
          <p>Aucun questionnaire pour le moment.</p>
          <a href="/create.html" class="btn btn-primary btn-sm">+ Créer un questionnaire</a>
        </div>
      `;
      return;
    }

    for (const survey of surveys) {
      const card = document.createElement('div');
      card.className = `survey-card ${survey.isClosed ? 'is-closed' : ''}`;

      const qCount = survey.questions?.length ?? survey.questionCount ?? 0;
      const questionCountText = `${qCount} question${qCount > 1 ? 's' : ''}`;
      const descHtml = survey.description
        ? `<p class="survey-card-desc">${this.escapeHtml(survey.description)}</p>`
        : '';
      const statusBadge = `<span class="badge-status ${survey.isClosed ? 'status-closed' : 'status-active'}"><span class="badge-dot"></span>${survey.isClosed ? 'Terminé' : 'En cours'}</span>`;

      card.innerHTML = `
        <div class="survey-card-info">
          <div class="survey-card-title-row">
            <h3>${this.escapeHtml(survey.title)}</h3>
            ${statusBadge}
          </div>
          ${descHtml}
          <span class="survey-card-meta">${questionCountText}</span>
        </div>
        <div class="survey-card-actions">
          <button class="btn btn-secondary btn-sm btn-view-stats" type="button">Résultats</button>
          <button class="btn btn-secondary btn-sm btn-share" type="button">Partager</button>
          <button class="btn btn-secondary btn-sm btn-toggle-status" type="button" title="${survey.isClosed ? 'Rouvrir le questionnaire' : 'Terminer le questionnaire'}">${survey.isClosed ? 'Rouvrir' : 'Terminer'}</button>
          <button class="btn btn-secondary btn-sm btn-duplicate" type="button">Dupliquer</button>
          <button class="btn-danger-ghost btn-delete-survey" type="button" title="Supprimer" aria-label="Supprimer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      `;

      card.querySelector('.btn-view-stats').addEventListener('click', () => {
        this.openStatsModal(survey.id);
      });

      card.querySelector('.btn-share').addEventListener('click', () => {
        this.openShareModal(survey.id);
      });

      card.querySelector('.btn-toggle-status').addEventListener('click', async () => {
        try {
          const updated = await this.#apiClient.toggleSurveyStatus(survey.id);
          ToastNotification.show(
            updated.isClosed ? 'Questionnaire terminé (clôturé)' : 'Questionnaire rouvert',
            true,
          );
          this.loadSurveys();
        } catch (err) {
          ToastNotification.show(err.message, false);
        }
      });

      card.querySelector('.btn-duplicate').addEventListener('click', async () => {
        try {
          await this.#apiClient.duplicateSurvey(survey.id);
          ToastNotification.show('Questionnaire dupliqué avec succès', true);
          this.loadSurveys();
        } catch (err) {
          ToastNotification.show(err.message, false);
        }
      });

      const deleteBtn = card.querySelector('.btn-delete-survey');
      let isConfirmingDelete = false;
      let deleteTimeout = null;

      deleteBtn.addEventListener('click', async () => {
        if (!isConfirmingDelete) {
          isConfirmingDelete = true;
          deleteBtn.classList.add('btn-delete-confirming');
          deleteBtn.textContent = 'Supprimer ?';
          deleteTimeout = setTimeout(() => {
            isConfirmingDelete = false;
            deleteBtn.classList.remove('btn-delete-confirming');
            deleteBtn.innerHTML = `
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            `;
          }, 3500);
          return;
        }

        clearTimeout(deleteTimeout);
        try {
          deleteBtn.disabled = true;
          await this.#apiClient.deleteSurvey(survey.id);
          ToastNotification.show('Questionnaire supprimé', true);
          this.loadSurveys();
        } catch (err) {
          ToastNotification.show(err.message, false);
          deleteBtn.disabled = false;
          isConfirmingDelete = false;
          deleteBtn.classList.remove('btn-delete-confirming');
        }
      });

      this.#surveysListContainer.appendChild(card);
    }
  }

  async openStatsModal(surveyId) {
    try {
      const stats = await this.#apiClient.fetchStats(surveyId);
      this.#currentStatsData = stats;
      document.getElementById('stats-survey-title').textContent = stats.survey.title;

      const totalDisplay = document.getElementById('stats-total-responses');
      const csvBtn = document.getElementById('btn-export-csv');
      if (csvBtn) {
        csvBtn.href = `/api/surveys/${surveyId}/export/csv`;
      }
      this.#statsQuestionsContainer.innerHTML = '';

      if (stats.totalResponses === 0) {
        totalDisplay.textContent = 'Aucun avis enregistré.';
        this.#statsQuestionsContainer.innerHTML = `
          <div class="empty-card">
            Aucun avis pour l'instant.
          </div>
        `;
        this.#statsModal.classList.remove('hidden');
        return;
      }

      const scoreText =
        stats.globalAverageScore > 0 ? ` • Moyenne globale : ${stats.globalAverageScore} / 5` : '';
      totalDisplay.textContent = `${stats.totalResponses} participant${stats.totalResponses > 1 ? 's' : ''}${scoreText}`;

      for (let i = 0; i < stats.questions.length; i++) {
        const q = stats.questions[i];
        const qBlock = document.createElement('div');
        qBlock.className = 'stat-question-block';

        const imgHtml = q.imageUrl
          ? `<div class="stat-img-wrapper"><img src="${this.escapeHtml(q.imageUrl)}" class="stat-question-thumb" alt="Visuel" /></div>`
          : '';

        let typeBadge = '';
        if (q.type === 'ranking') {
          typeBadge = '<span class="badge-type">Classement</span>';
        } else if (q.type === 'choice') {
          typeBadge = '<span class="badge-type">Choix unique</span>';
        } else if (q.type === 'multiple_choice') {
          typeBadge = '<span class="badge-type">Choix multiple</span>';
        } else {
          typeBadge = '<span class="badge-type">Échelle d\'avis</span>';
        }

        const qScoreBadge =
          typeof q.averageScore === 'number' && q.averageScore > 0
            ? `<span class="stat-q-score">${q.averageScore} / 5</span>`
            : '';

        if (q.type === 'ranking') {
          const maxPoints = Math.max(...q.options.map((o) => o.points || 0), 1);
          const rankingRowsHtml = q.options
            .map((opt, idx) => {
              const barWidth = maxPoints > 0 ? Math.round((opt.points / maxPoints) * 100) : 0;
              const isFirst = idx === 0 && opt.points > 0;
              return `
                <div class="stat-result-row">
                  <div class="stat-ranking-badge ${isFirst ? 'is-first' : ''}">#${idx + 1}</div>
                  <div class="stat-result-content">
                    <div class="stat-result-header">
                      <span class="stat-result-label ${opt.points > 0 ? 'is-active' : ''}">${this.escapeHtml(opt.text)}</span>
                      <span class="stat-result-numbers">
                        <strong>${opt.points} pt${opt.points > 1 ? 's' : ''}</strong>
                        <span class="stat-result-sub">(rang moy. ${opt.averageRank})</span>
                      </span>
                    </div>
                    <div class="stat-progress-track">
                      <div class="stat-progress-fill ${isFirst ? 'is-first-fill' : ''}" style="width: ${barWidth}%"></div>
                    </div>
                  </div>
                </div>
              `;
            })
            .join('');

          qBlock.innerHTML = `
            ${imgHtml}
            <div class="stat-question-title-row">
              <h4><span class="stat-q-index">${i + 1}.</span> ${this.escapeHtml(q.text)} ${typeBadge}</h4>
            </div>
            <div class="stat-results-list">
              ${rankingRowsHtml}
            </div>
          `;
        } else {
          const optionsRowsHtml = q.options
            .map((opt) => {
              const hasVotes = opt.votes > 0;
              return `
                <div class="stat-result-row">
                  <div class="stat-result-content">
                    <div class="stat-result-header">
                      <span class="stat-result-label ${hasVotes ? 'is-active' : ''}">${this.escapeHtml(opt.text)}</span>
                      <span class="stat-result-numbers">
                        <strong>${opt.percentage}%</strong>
                        <span class="stat-result-sub">(${opt.votes} vote${opt.votes > 1 ? 's' : ''})</span>
                      </span>
                    </div>
                    <div class="stat-progress-track">
                      <div class="stat-progress-fill ${hasVotes ? 'has-votes' : ''}" style="width: ${opt.percentage}%"></div>
                    </div>
                  </div>
                </div>
              `;
            })
            .join('');

          qBlock.innerHTML = `
            ${imgHtml}
            <div class="stat-question-title-row">
              <h4><span class="stat-q-index">${i + 1}.</span> ${this.escapeHtml(q.text)} ${typeBadge}</h4>
              ${qScoreBadge}
            </div>
            <div class="stat-results-list">
              ${optionsRowsHtml}
            </div>
          `;
        }

        this.#statsQuestionsContainer.appendChild(qBlock);
      }

      this.#statsModal.classList.remove('hidden');
    } catch (err) {
      ToastNotification.show(err.message, false);
    }
  }

  closeStatsModal() {
    this.#statsModal.classList.add('hidden');
  }

  async openShareModal(surveyId) {
    try {
      this.#currentShareSurveyId = surveyId;
      const share = await this.#apiClient.fetchShare(surveyId);
      document.getElementById('share-survey-title').textContent = `Partager "${share.surveyTitle}"`;
      document.getElementById('share-qr-image').src = share.qrCode;

      const chips = document.querySelectorAll('#qr-color-chips .qr-color-chip');
      chips.forEach((c) => c.classList.remove('active'));
      const defaultChip = document.querySelector(
        '#qr-color-chips .qr-color-chip[data-color="#0c0c0e"]',
      );
      if (defaultChip) defaultChip.classList.add('active');

      const downloadQrLink = document.getElementById('share-download-qr');
      if (downloadQrLink) {
        downloadQrLink.href = share.qrCode;
        downloadQrLink.download = `qrcode-${share.surveyId}.png`;
      }

      const urlInput = document.getElementById('share-url-input');
      const openLink = document.getElementById('share-open-link');
      const qrImg = document.getElementById('share-qr-image');

      let currentShareUrl = share.shareUrl;
      if (!currentShareUrl.includes('//qa.') && window.location.hostname.startsWith('q.')) {
        const deducedOrigin = window.location.origin.replace('//q.', '//qa.');
        currentShareUrl = `${deducedOrigin}/?survey=${share.surveyId}`;
      }

      urlInput.value = currentShareUrl;
      openLink.href = currentShareUrl;

      urlInput.oninput = async () => {
        const typedUrl = urlInput.value.trim();
        if (typedUrl.startsWith('http://') || typedUrl.startsWith('https://')) {
          openLink.href = typedUrl;
          try {
            const activeChip = document.querySelector('#qr-color-chips .qr-color-chip.active');
            const currentColor = activeChip ? activeChip.dataset.color : '#000000';
            const updated = await this.#apiClient.fetchShare(surveyId, currentColor, typedUrl);
            qrImg.src = updated.qrCode;
            if (downloadQrLink) {
              downloadQrLink.href = updated.qrCode;
            }
          } catch {}
        }
      };

      urlInput.onclick = () => {
        urlInput.select();
      };

      const copyBtn = document.getElementById('btn-copy-url');
      copyBtn.onclick = async () => {
        try {
          await navigator.clipboard.writeText(urlInput.value);
        } catch {
          urlInput.select();
          document.execCommand('copy');
        }
        copyBtn.classList.add('btn-copied');
        const origText = copyBtn.textContent;
        copyBtn.innerHTML = '&#10003; Copi&eacute; !';
        ToastNotification.show('Lien copié !', true);
        setTimeout(() => {
          copyBtn.classList.remove('btn-copied');
          copyBtn.textContent = origText;
        }, 2000);
      };

      this.#shareModal.classList.remove('hidden');
    } catch (err) {
      ToastNotification.show(err.message, false);
    }
  }

  closeShareModal() {
    this.#shareModal.classList.add('hidden');
  }

  async openCompareModal() {
    try {
      const surveys = await this.#apiClient.fetchSurveys();
      if (surveys.length < 2) {
        ToastNotification.show('Il vous faut au moins 2 questionnaires pour comparer', false);
        return;
      }

      this.#selectSurveyA.innerHTML = surveys
        .map((s) => `<option value="${s.id}">${this.escapeHtml(s.title)}</option>`)
        .join('');

      this.#selectSurveyB.innerHTML = surveys
        .map(
          (s, idx) =>
            `<option value="${s.id}" ${idx === 1 ? 'selected' : ''}>${this.escapeHtml(s.title)}</option>`,
        )
        .join('');

      this.#compareResultsContainer.innerHTML =
        '<p class="compare-placeholder">Sélectionnez deux questionnaires et cliquez sur "Comparer" pour visualiser l\'évolution.</p>';

      this.#compareModal.classList.remove('hidden');
    } catch (err) {
      ToastNotification.show(err.message, false);
    }
  }

  closeCompareModal() {
    this.#compareModal.classList.add('hidden');
  }

  async runComparison() {
    const idA = this.#selectSurveyA.value;
    const idB = this.#selectSurveyB.value;

    if (idA === idB) {
      ToastNotification.show('Veuillez sélectionner deux questionnaires différents', false);
      return;
    }

    try {
      this.#compareResultsContainer.innerHTML =
        '<p class="empty-card">Calcul de la comparaison...</p>';
      const comp = await this.#apiClient.compareSurveys(idA, idB);

      const deltaParticipantsClass =
        comp.deltaResponses > 0
          ? 'delta-positive'
          : comp.deltaResponses < 0
            ? 'delta-negative'
            : 'delta-neutral';
      const deltaParticipantsText = `${comp.deltaResponses >= 0 ? '+' : ''}${comp.deltaResponses}`;

      const deltaScoreClass =
        comp.deltaGlobalScore > 0
          ? 'delta-positive'
          : comp.deltaGlobalScore < 0
            ? 'delta-negative'
            : 'delta-neutral';
      const deltaScoreText = `${comp.deltaGlobalScore >= 0 ? '+' : ''}${comp.deltaGlobalScore} pts`;

      const rowsHtml = comp.comparisons
        .map((row) => {
          const deltaScoreStr =
            row.deltaScore !== null
              ? `<span class="delta-chip ${row.deltaScore > 0 ? 'chip-positive' : row.deltaScore < 0 ? 'chip-negative' : 'chip-neutral'}">${row.deltaScore >= 0 ? '+' : ''}${row.deltaScore}</span>`
              : '<span class="delta-chip chip-neutral">-</span>';

          return `
          <div class="compare-table-row">
            <span class="compare-col-q">${this.escapeHtml(row.questionText)}</span>
            <span class="compare-col-val">${row.scoreA !== null ? `${row.scoreA}/5` : 'N/A'}</span>
            <span class="compare-col-val">${row.scoreB !== null ? `${row.scoreB}/5` : 'N/A'}</span>
            <span class="compare-col-delta">${deltaScoreStr}</span>
          </div>
        `;
        })
        .join('');

      this.#compareResultsContainer.innerHTML = `
        <div class="compare-summary-cards">
          <div class="compare-kpi-card">
            <span class="compare-kpi-label">Participants</span>
            <div class="compare-kpi-values">
              <span>${comp.totalResponsesA} &rarr; ${comp.totalResponsesB}</span>
              <span class="compare-kpi-delta ${deltaParticipantsClass}">${deltaParticipantsText}</span>
            </div>
          </div>
          <div class="compare-kpi-card">
            <span class="compare-kpi-label">Note Moyenne Globale</span>
            <div class="compare-kpi-values">
              <span>${comp.globalScoreA}/5 &rarr; ${comp.globalScoreB}/5</span>
              <span class="compare-kpi-delta ${deltaScoreClass}">${deltaScoreText}</span>
            </div>
          </div>
        </div>

        <div class="compare-table">
          <div class="compare-table-header">
            <span class="compare-col-q">Question</span>
            <span class="compare-col-val">${this.escapeHtml(comp.surveyA.title)}</span>
            <span class="compare-col-val">${this.escapeHtml(comp.surveyB.title)}</span>
            <span class="compare-col-delta">Évolution</span>
          </div>
          <div class="compare-table-body">
            ${rowsHtml}
          </div>
        </div>
      `;
    } catch (err) {
      this.#compareResultsContainer.innerHTML = `<p class="empty-card">${err.message}</p>`;
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
  new SurveyListApp();
});
