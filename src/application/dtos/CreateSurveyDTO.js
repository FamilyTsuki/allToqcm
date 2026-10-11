import { ValidationError } from '../../domain/errors/ValidationError.js';

const LIMITS = Object.freeze({
  TITLE_MAX_LENGTH: 200,
  DESCRIPTION_MAX_LENGTH: 2000,
  MAX_QUESTIONS: 50,
  QUESTION_TEXT_MAX_LENGTH: 500,
  IMAGE_URL_MAX_LENGTH: 2000,
  MAX_OPTIONS_PER_QUESTION: 20,
  OPTION_TEXT_MAX_LENGTH: 200,
});

export class CreateSurveyDTO {
  #title;
  #description;
  #questions;

  constructor({ title, description = '', questions = [] }) {
    this.#title = title;
    this.#description = description;
    this.#questions = questions;
  }

  get title() {
    return this.#title;
  }

  get description() {
    return this.#description;
  }

  get questions() {
    return this.#questions;
  }

  static fromJSON(json = {}) {
    return new CreateSurveyDTO({
      title: json.title,
      description: json.description,
      questions: json.questions,
    });
  }

  validate() {
    if (!this.#title || typeof this.#title !== 'string' || this.#title.trim().length === 0) {
      throw new ValidationError('Le titre du questionnaire est obligatoire');
    }

    if (this.#title.trim().length > LIMITS.TITLE_MAX_LENGTH) {
      throw new ValidationError(
        `Le titre ne peut pas dépasser ${LIMITS.TITLE_MAX_LENGTH} caractères`,
      );
    }

    if (
      typeof this.#description === 'string' &&
      this.#description.trim().length > LIMITS.DESCRIPTION_MAX_LENGTH
    ) {
      throw new ValidationError(
        `La description ne peut pas dépasser ${LIMITS.DESCRIPTION_MAX_LENGTH} caractères`,
      );
    }

    if (!Array.isArray(this.#questions) || this.#questions.length === 0) {
      throw new ValidationError('Le questionnaire doit comporter au moins une question');
    }

    if (this.#questions.length > LIMITS.MAX_QUESTIONS) {
      throw new ValidationError(
        `Un questionnaire ne peut pas comporter plus de ${LIMITS.MAX_QUESTIONS} questions`,
      );
    }

    for (const q of this.#questions) {
      const text = typeof q === 'string' ? q : q?.text;
      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        throw new ValidationError('Chaque question doit avoir un intitulé');
      }

      if (text.trim().length > LIMITS.QUESTION_TEXT_MAX_LENGTH) {
        throw new ValidationError(
          `L’intitulé d’une question ne peut pas dépasser ${LIMITS.QUESTION_TEXT_MAX_LENGTH} caractères`,
        );
      }

      const imageUrl = typeof q === 'object' && q !== null ? q.imageUrl : null;
      if (imageUrl !== null && imageUrl !== undefined && typeof imageUrl === 'string') {
        const trimmedUrl = imageUrl.trim();
        if (trimmedUrl.length > 0) {
          if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
            throw new ValidationError(
              "L'URL de l'image doit être une adresse web valide (http:// ou https://)",
            );
          }
          if (trimmedUrl.length > LIMITS.IMAGE_URL_MAX_LENGTH) {
            throw new ValidationError(
              `L’URL de l’image ne peut pas dépasser ${LIMITS.IMAGE_URL_MAX_LENGTH} caractères`,
            );
          }
        }
      }

      const options = typeof q === 'object' && q !== null ? q.options : null;
      if (Array.isArray(options)) {
        if (options.length > LIMITS.MAX_OPTIONS_PER_QUESTION) {
          throw new ValidationError(
            `Une question ne peut pas comporter plus de ${LIMITS.MAX_OPTIONS_PER_QUESTION} options`,
          );
        }
        for (const opt of options) {
          const optText = typeof opt === 'string' ? opt : opt?.text;
          if (
            typeof optText === 'string' &&
            optText.trim().length > LIMITS.OPTION_TEXT_MAX_LENGTH
          ) {
            throw new ValidationError(
              `Le texte d’une option ne peut pas dépasser ${LIMITS.OPTION_TEXT_MAX_LENGTH} caractères`,
            );
          }
        }
      }
    }
  }
}
