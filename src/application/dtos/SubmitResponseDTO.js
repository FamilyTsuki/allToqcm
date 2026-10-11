import { ValidationError } from '../../domain/errors/ValidationError.js';

const LIMITS = Object.freeze({
  PARTICIPANT_NAME_MAX_LENGTH: 100,
  MAX_ANSWERS: 50,
  MAX_SELECTED_OPTIONS_PER_ANSWER: 20,
});

export class SubmitResponseDTO {
  #participantName;
  #answers;

  constructor({ participantName = 'Anonyme', answers = [] }) {
    this.#participantName = participantName;
    this.#answers = answers;
  }

  get participantName() {
    return this.#participantName;
  }

  get answers() {
    return this.#answers;
  }

  static fromJSON(json = {}) {
    return new SubmitResponseDTO({
      participantName: json.participantName,
      answers: json.answers,
    });
  }

  validate() {
    if (
      typeof this.#participantName === 'string' &&
      this.#participantName.trim().length > LIMITS.PARTICIPANT_NAME_MAX_LENGTH
    ) {
      throw new ValidationError(
        `Le nom du participant ne peut pas dépasser ${LIMITS.PARTICIPANT_NAME_MAX_LENGTH} caractères`,
      );
    }

    if (!Array.isArray(this.#answers)) {
      throw new ValidationError('Les réponses doivent être une liste');
    }

    if (this.#answers.length > LIMITS.MAX_ANSWERS) {
      throw new ValidationError('Nombre de réponses excessif');
    }

    for (const ans of this.#answers) {
      if (!ans.questionId) {
        throw new ValidationError('Chaque réponse doit contenir un questionId');
      }

      if (!Array.isArray(ans.selectedOptionIds)) {
        throw new ValidationError('Chaque réponse doit contenir une liste d’options sélectionnées');
      }

      if (ans.selectedOptionIds.length > LIMITS.MAX_SELECTED_OPTIONS_PER_ANSWER) {
        throw new ValidationError('Nombre d’options sélectionnées excessif');
      }
    }
  }
}
