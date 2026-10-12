class CreatorApiClient {
  #baseUrl;

  constructor(baseUrl = '/api/surveys') {
    this.#baseUrl = baseUrl;
  }

  async createSurvey(payload) {
    const response = await fetch(this.#baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Erreur lors de la création');
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

class SurveyCreateApp {
  #apiClient;
  #formElement;
  #questionsContainer;
  #addQuestionButton;

  constructor() {
    this.#apiClient = new CreatorApiClient();
    this.#formElement = document.getElementById('creator-form');
    this.#questionsContainer = document.getElementById('creator-questions-list');
    this.#addQuestionButton = document.getElementById('btn-add-question');

    this.init();
  }

  init() {
    this.#addQuestionButton.addEventListener('click', () => this.addQuestionRow(true));
    this.#formElement.addEventListener('submit', (e) => this.handleSubmit(e));

    const titleInput = document.getElementById('survey-title-input');
    titleInput.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.#formElement.requestSubmit();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.altKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        this.addQuestionRow(true);
      }
    });

    this.addQuestionRow(false);
  }

  addQuestionRow(shouldFocus = false) {
    const index = this.#questionsContainer.children.length + 1;
    const card = document.createElement('div');
    card.className = 'question-block-card';

    const requiredAttr = index === 1 ? 'required' : '';
    card.innerHTML = `
      <div class="question-row-primary">
        <span class="question-number">${index}.</span>
        <input type="text" class="input-q-text" ${requiredAttr} placeholder="Écrivez votre question...">
        <div class="question-type-picker">
          <select class="select-q-type" title="Type de question">
            <option value="scale">Échelle (1-5)</option>
            <option value="ranking">Classement</option>
          </select>
        </div>
        <button type="button" class="btn-toggle-img" title="Ajouter une image visuelle">&#128444;</button>
        <div class="question-row-actions">
          <button type="button" class="btn-reorder-q btn-move-up" title="Monter">&uarr;</button>
          <button type="button" class="btn-reorder-q btn-move-down" title="Descendre">&darr;</button>
          <button type="button" class="btn-remove-q" title="Supprimer">&times;</button>
        </div>
      </div>
      <div class="question-img-field hidden">
        <input type="url" class="input-q-image" placeholder="URL du visuel (ex: https://.../image.png)">
      </div>
      <div class="question-ranking-container hidden">
        <div class="ranking-options-label">Éléments à classer par priorité :</div>
        <div class="ranking-options-list"></div>
        <button type="button" class="btn-add-rank-item btn-ghost btn-sm">+ Ajouter un élément</button>
      </div>
    `;

    const input = card.querySelector('.input-q-text');
    const removeBtn = card.querySelector('.btn-remove-q');
    const moveUpBtn = card.querySelector('.btn-move-up');
    const moveDownBtn = card.querySelector('.btn-move-down');
    const toggleImgBtn = card.querySelector('.btn-toggle-img');
    const imgField = card.querySelector('.question-img-field');
    const typeSelect = card.querySelector('.select-q-type');
    const rankingContainer = card.querySelector('.question-ranking-container');
    const rankingList = card.querySelector('.ranking-options-list');
    const addRankBtn = card.querySelector('.btn-add-rank-item');

    const addRankOption = (defaultText = '') => {
      const optRow = document.createElement('div');
      optRow.className = 'ranking-option-row';
      optRow.innerHTML = `
        <span class="ranking-opt-bullet">&bull;</span>
        <input type="text" class="input-rank-opt" placeholder="Choix à classer..." value="${defaultText}">
        <button type="button" class="btn-remove-rank-opt" title="Supprimer">&times;</button>
      `;
      optRow.querySelector('.btn-remove-rank-opt').addEventListener('click', () => {
        if (rankingList.children.length > 2) {
          optRow.remove();
        }
      });
      rankingList.appendChild(optRow);
    };

    toggleImgBtn.addEventListener('click', () => {
      imgField.classList.toggle('hidden');
      if (!imgField.classList.contains('hidden')) {
        imgField.querySelector('.input-q-image')?.focus();
      }
    });

    typeSelect.addEventListener('change', () => {
      if (typeSelect.value === 'ranking') {
        rankingContainer.classList.remove('hidden');
        if (rankingList.children.length === 0) {
          addRankOption('Choix 1');
          addRankOption('Choix 2');
          addRankOption('Choix 3');
        }
      } else {
        rankingContainer.classList.add('hidden');
      }
    });

    addRankBtn.addEventListener('click', () => addRankOption());

    if (index === 1 && this.#questionsContainer.children.length === 0) {
      removeBtn.style.visibility = 'hidden';
    }

    moveUpBtn.addEventListener('click', () => {
      const prev = card.previousElementSibling;
      if (prev) {
        this.#questionsContainer.insertBefore(card, prev);
        this.renumberQuestions();
        input.focus();
      }
    });

    moveDownBtn.addEventListener('click', () => {
      const next = card.nextElementSibling;
      if (next) {
        this.#questionsContainer.insertBefore(next, card);
        this.renumberQuestions();
        input.focus();
      }
    });

    removeBtn.addEventListener('click', () => {
      if (this.#questionsContainer.children.length > 1) {
        card.remove();
        this.renumberQuestions();
      }
    });

    input.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.#formElement.requestSubmit();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        this.addQuestionRow(true);
      }
    });

    this.#questionsContainer.appendChild(card);

    if (shouldFocus) {
      input.focus();
    }
    this.renumberQuestions();
  }

  renumberQuestions() {
    const cards = this.#questionsContainer.children;
    for (let i = 0; i < cards.length; i++) {
      const numSpan = cards[i].querySelector('.question-number');
      if (numSpan) {
        numSpan.textContent = `${i + 1}.`;
      }
      const removeBtn = cards[i].querySelector('.btn-remove-q');
      if (removeBtn) {
        removeBtn.style.visibility = cards.length > 1 ? 'visible' : 'hidden';
      }
      const moveUpBtn = cards[i].querySelector('.btn-move-up');
      if (moveUpBtn) {
        moveUpBtn.disabled = i === 0;
      }
      const moveDownBtn = cards[i].querySelector('.btn-move-down');
      if (moveDownBtn) {
        moveDownBtn.disabled = i === cards.length - 1;
      }
    }
  }

  async handleSubmit(event) {
    event.preventDefault();

    const titleInput = document.getElementById('survey-title-input');
    const descInput = document.getElementById('survey-desc-input');

    const cards = [...this.#questionsContainer.children];
    for (const card of cards) {
      const text = card.querySelector('.input-q-text').value.trim();
      if (text.length === 0 && this.#questionsContainer.children.length > 1) {
        card.remove();
      }
    }
    this.renumberQuestions();

    const activeCards = this.#questionsContainer.children;
    const questions = [];

    for (const card of activeCards) {
      const text = card.querySelector('.input-q-text').value.trim();
      if (text.length > 0) {
        const type = card.querySelector('.select-q-type').value;
        const imageUrl = card.querySelector('.input-q-image').value.trim() || null;
        let options = null;

        if (type === 'ranking') {
          const rankInputs = card.querySelectorAll('.input-rank-opt');
          const rankOpts = [...rankInputs]
            .map((inp) => inp.value.trim())
            .filter((val) => val.length > 0);

          if (rankOpts.length < 2) {
            ToastNotification.show('Une question à classement nécessite au moins 2 choix', false);
            return;
          }
          options = rankOpts.map((t) => ({ text: t }));
        }

        questions.push({
          text,
          type,
          imageUrl,
          options,
        });
      }
    }

    if (questions.length === 0) {
      ToastNotification.show('Veuillez ajouter au moins une question', false);
      return;
    }

    const payload = {
      title: titleInput.value.trim(),
      description: descInput.value.trim(),
      questions,
    };

    try {
      const submitBtn = this.#formElement.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Publication en cours...';
      }

      const result = await this.#apiClient.createSurvey(payload);
      ToastNotification.show('Questionnaire publié !', true);
      this.showShareModal(result.id, result.shareUrl, result.qrCode);
    } catch (error) {
      ToastNotification.show(error.message, false);
      const submitBtn = this.#formElement.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Publier le questionnaire';
      }
    }
  }

  showShareModal(surveyId, shareUrl, qrCode) {
    const modal = document.getElementById('share-modal');
    const qrImg = document.getElementById('share-qr-image');
    const urlInput = document.getElementById('share-url-input');
    const openLink = document.getElementById('share-open-link');
    const downloadQrLink = document.getElementById('share-download-qr');
    const copyBtn = document.getElementById('btn-copy-url');
    const closeBtn = document.getElementById('btn-close-share-modal');

    let currentShareUrl = shareUrl;
    if (!currentShareUrl.includes('//qa.') && window.location.hostname.startsWith('q.')) {
      const deducedOrigin = window.location.origin.replace('//q.', '//qa.');
      currentShareUrl = `${deducedOrigin}/?survey=${surveyId}`;
    }

    qrImg.src = qrCode;
    urlInput.value = currentShareUrl;
    openLink.href = currentShareUrl;
    if (downloadQrLink) {
      downloadQrLink.href = qrCode;
      downloadQrLink.download = `qrcode-${surveyId}.png`;
    }

    urlInput.oninput = async () => {
      const typedUrl = urlInput.value.trim();
      if (typedUrl.startsWith('http://') || typedUrl.startsWith('https://')) {
        openLink.href = typedUrl;
        const activeChip = document.querySelector('#qr-color-chips .qr-color-chip.active');
        const color = activeChip ? activeChip.dataset.color : '#000000';
        try {
          const response = await fetch(
            `/api/surveys/${surveyId}/share?color=${encodeURIComponent(color)}&url=${encodeURIComponent(typedUrl)}`,
          );
          if (response.ok) {
            const data = await response.json();
            qrImg.src = data.qrCode;
            if (downloadQrLink) {
              downloadQrLink.href = data.qrCode;
            }
          }
        } catch {}
      }
    };

    urlInput.onclick = () => {
      urlInput.select();
    };

    const colorChips = document.querySelectorAll('#qr-color-chips .qr-color-chip');
    colorChips.forEach((chip) => {
      chip.onclick = async () => {
        colorChips.forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        const color = chip.dataset.color;
        const typedUrl = urlInput.value.trim();
        const urlParam = typedUrl ? `&url=${encodeURIComponent(typedUrl)}` : '';
        try {
          const response = await fetch(
            `/api/surveys/${surveyId}/share?color=${encodeURIComponent(color)}${urlParam}`,
          );
          if (response.ok) {
            const data = await response.json();
            qrImg.src = data.qrCode;
            if (downloadQrLink) {
              downloadQrLink.href = data.qrCode;
            }
          }
        } catch {}
      };
    });

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

    closeBtn.onclick = () => {
      window.location.href = '/';
    };

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
        window.location.href = '/';
      }
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        window.location.href = '/';
      }
    });

    modal.classList.remove('hidden');
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
  new SurveyCreateApp();
});
