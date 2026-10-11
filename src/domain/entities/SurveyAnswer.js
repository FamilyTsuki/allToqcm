import { ValidationError } from '../errors/ValidationError.js';

export class SurveyAnswer {
  #questionId;
  #selectedOptionIds;

  constructor(questionId, selectedOptionIds = []) {
    if (!questionId) {
      throw new ValidationError('Question ID is required');
    }
    this.#questionId = questionId;
    this.#selectedOptionIds = Array.isArray(selectedOptionIds) ? [...selectedOptionIds] : [];
  }

  get questionId() {
    return this.#questionId;
  }

  get selectedOptionIds() {
    return [...this.#selectedOptionIds];
  }

  toJSON() {
    return {
      questionId: this.#questionId,
      selectedOptionIds: this.#selectedOptionIds,
    };
  }
}
