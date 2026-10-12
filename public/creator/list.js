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

class RadarChartRenderer {
  static render(container, questions) {
    container.innerHTML = '';
    const validQuestions = questions.filter(
      (q) => typeof q.averageScore === 'number' && q.averageScore > 0,
    );

    if (validQuestions.length < 3) {
      container.innerHTML =
        '<div class="radar-empty-notice">Le graphique radar nécessite au moins 3 questions avec des avis pour tracer la toile.</div>';
      return;
    }

    const size = 420;
    const center = size / 2;
    const radius = 135;
    const totalAxes = validQuestions.length;

    const levels = [1, 2, 3, 4, 5];
    const gridPolygons = levels
      .map((lvl) => {
        const r = (radius * lvl) / 5;
        const pts = validQuestions
          .map((_, i) => {
            const angle = (2 * Math.PI * i) / totalAxes - Math.PI / 2;
            return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
          })
          .join(' ');
        return `<polygon points="${pts}" class="radar-grid-level" />`;
      })
      .join('');

    const spokes = validQuestions
      .map((_, i) => {
        const angle = (2 * Math.PI * i) / totalAxes - Math.PI / 2;
        const x2 = center + radius * Math.cos(angle);
        const y2 = center + radius * Math.sin(angle);
        return `<line x1="${center}" y1="${center}" x2="${x2}" y2="${y2}" class="radar-spoke" />`;
      })
      .join('');

    const dataPoints = validQuestions.map((q, i) => {
      const score = Math.max(1, Math.min(5, q.averageScore));
      const r = (radius * score) / 5;
      const angle = (2 * Math.PI * i) / totalAxes - Math.PI / 2;
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      return { x, y, score, text: q.text };
    });

    const polygonPoints = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

    const dots = dataPoints
      .map(
        (p) =>
          `<circle cx="${p.x}" cy="${p.y}" r="4.5" class="radar-dot"><title>${p.text} : ${p.score}/5</title></circle>`,
      )
      .join('');

    const labels = validQuestions
      .map((q, i) => {
        const angle = (2 * Math.PI * i) / totalAxes - Math.PI / 2;
        const lx = center + (radius + 26) * Math.cos(angle);
        const ly = center + (radius + 26) * Math.sin(angle);
        const cos = Math.cos(angle);
        const anchor = Math.abs(cos) < 0.25 ? 'middle' : cos > 0 ? 'start' : 'end';
        const shortText = q.text.length > 22 ? q.text.slice(0, 21) + '…' : q.text;
        return `<text x="${lx}" y="${ly}" class="radar-label" text-anchor="${anchor}">${shortText} (${q.averageScore}/5)</text>`;
      })
      .join('');

    container.innerHTML = `
      <div class="radar-svg-wrapper">
        <svg viewBox="0 0 ${size} ${size}" class="radar-svg">
          ${gridPolygons}
          ${spokes}
          <polygon points="${polygonPoints}" class="radar-polygon" />
          ${dots}
          ${labels}
        </svg>
      </div>
    `;
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
  #statsBarsTab;
  #statsRadarTab;
  #statsRadarContainer;
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

    this.#statsBarsTab = document.getElementById('btn-stats-view-bars');
    this.#statsRadarTab = document.getElementById('btn-stats-view-radar');
    this.#statsQuestionsContainer = document.getElementById('stats-questions-container');
    this.#statsRadarContainer = document.getElementById('stats-radar-container');

    this.init();
  }

  init() {
    this.#refreshButton.addEventListener('click', () => this.loadSurveys());
    this.#closeStatsModalButton.addEventListener('click', () => this.closeStatsModal());
    this.#closeShareModalButton.addEventListener('click', () => this.closeShareModal());

    this.#openCompareButton.addEventListener('click', () => this.openCompareModal());
    this.#closeCompareModalButton.addEventListener('click', () => this.closeCompareModal());
    this.#runCompareButton.addEventListener('click', () => this.runComparison());

    this.#statsBarsTab.addEventListener('click', () => this.switchStatsView('bars'));
    this.#statsRadarTab.addEventListener('click', () => this.switchStatsView('radar'));

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

  switchStatsView(view) {
    if (view === 'bars') {
      this.#statsBarsTab.classList.add('active');
      this.#statsRadarTab.classList.remove('active');
      this.#statsQuestionsContainer.classList.remove('hidden');
      this.#statsRadarContainer.classList.add('hidden');
    } else {
      this.#statsBarsTab.classList.remove('active');
      this.#statsRadarTab.classList.add('active');
      this.#statsQuestionsContainer.classList.add('hidden');
      this.#statsRadarContainer.classList.remove('hidden');
      if (this.#currentStatsData) {
        RadarChartRenderer.render(this.#statsRadarContainer, this.#currentStatsData.questions);
      }
    }
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
      const statusBadge = `<span class="badge-status ${survey.isClosed ? 'status-closed' : 'status-active'}">${survey.isClosed ? 'Clôturé' : 'Actif'}</span>`;

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
          <button class="btn btn-secondary btn-sm btn-toggle-status" type="button">${survey.isClosed ? 'Rouvrir' : 'Clôturer'}</button>
          <button class="btn btn-secondary btn-sm btn-duplicate" type="button">Dupliquer</button>
          <button class="btn-danger-ghost btn-delete-survey" type="button" title="Supprimer">&times;</button>
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
            updated.isClosed ? 'Questionnaire clôturé' : 'Questionnaire rouvert',
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

      card.querySelector('.btn-delete-survey').addEventListener('click', async () => {
        if (confirm(`Supprimer le questionnaire "${survey.title}" ?`)) {
          try {
            await this.#apiClient.deleteSurvey(survey.id);
            ToastNotification.show('Questionnaire supprimé', true);
            this.loadSurveys();
          } catch (err) {
            ToastNotification.show(err.message, false);
          }
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
      this.switchStatsView('bars');

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
        stats.globalAverageScore > 0 ? ` • Moyenne : ${stats.globalAverageScore} / 5` : '';
      totalDisplay.textContent = `${stats.totalResponses} participant${stats.totalResponses > 1 ? 's' : ''}${scoreText}`;

      for (const q of stats.questions) {
        const qBlock = document.createElement('div');
        qBlock.className = 'stat-question-block';

        const imgHtml = q.imageUrl
          ? `<div class="stat-img-wrapper"><img src="${this.escapeHtml(q.imageUrl)}" class="stat-question-thumb" alt="Visuel" /></div>`
          : '';

        if (q.type === 'ranking') {
          const podiumHtml = q.options
            .map(
              (opt, idx) => `
              <div class="ranking-stat-row">
                <span class="ranking-badge">#${idx + 1}</span>
                <span class="ranking-text">${this.escapeHtml(opt.text)}</span>
                <span class="ranking-points">${opt.points} pts (rang moy. ${opt.averageRank})</span>
              </div>
            `,
            )
            .join('');

          qBlock.innerHTML = `
            ${imgHtml}
            <div class="stat-question-title-row">
              <h4>${this.escapeHtml(q.text)} <span class="badge-type">Classement</span></h4>
            </div>
            <div class="stat-ranking-list">
              ${podiumHtml}
            </div>
          `;
        } else {
          const segmentsHtml = q.options
            .filter((opt) => opt.votes > 0)
            .map(
              (opt, idx) =>
                `<div class="stat-segment segment-color-${idx % 5}" style="width: ${opt.percentage}%" title="${this.escapeHtml(opt.text)}: ${opt.percentage}%"></div>`,
            )
            .join('');

          const chipsHtml = q.options
            .map((opt, idx) => {
              const hasVotes = opt.votes > 0;
              return `
                <span class="stat-pill ${hasVotes ? `pill-active pill-color-${idx % 5}` : 'pill-zero'}">
                  ${this.escapeHtml(opt.text)} : <strong>${opt.percentage}%</strong> ${hasVotes ? `(${opt.votes})` : ''}
                </span>
              `;
            })
            .join('');

          const qScoreBadge =
            q.averageScore > 0 ? `<span class="stat-q-score">${q.averageScore} / 5</span>` : '';

          qBlock.innerHTML = `
            ${imgHtml}
            <div class="stat-question-title-row">
              <h4>${this.escapeHtml(q.text)}</h4>
              ${qScoreBadge}
            </div>
            <div class="stat-bar-container">
              ${segmentsHtml}
            </div>
            <div class="stat-chips-row">
              ${chipsHtml}
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

document.addEventListener('DOMContentLoaded', () => {
  new SurveyListApp();
});
