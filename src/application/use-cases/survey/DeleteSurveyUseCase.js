import { EntityNotFoundError } from '../../../domain/errors/EntityNotFoundError.js';

export class DeleteSurveyUseCase {
  #surveyRepository;

  constructor(surveyRepository) {
    this.#surveyRepository = surveyRepository;
  }

  async execute(surveyId) {
    const survey = await this.#surveyRepository.findById(surveyId);
    if (!survey) {
      throw new EntityNotFoundError('Survey', surveyId);
    }
    await this.#surveyRepository.delete(surveyId);
  }
}
