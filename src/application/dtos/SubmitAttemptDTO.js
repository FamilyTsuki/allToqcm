import { ValidationError } from '../../domain/errors/ValidationError.js';

export class SubmitAttemptDTO {
  #answers;

  constructor({ answers = [] }) {
    this.#answers = answers;
  }

  get answers() {
    return this.#answers;
  }

  static fromJSON(json = {}) {
    return new SubmitAttemptDTO({
      answers: json.answers,
    });
  }

  validate() {
    if (!Array.isArray(this.#answers)) {
      throw new ValidationError('Answers must be an array');
    }

    for (const ans of this.#answers) {
      if (!ans.questionId) {
        throw new ValidationError('Each answer must include a questionId');
      }

      if (!Array.isArray(ans.selectedOptionIds)) {
        throw new ValidationError('Each answer must include an array of selectedOptionIds');
      }
    }
  }
}
