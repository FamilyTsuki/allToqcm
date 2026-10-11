import { EntityNotFoundError } from '../../../domain/errors/EntityNotFoundError.js';

export class ToggleSurveyStatusUseCase {
  #surveyRepository;

  constructor(surveyRepository) {
    this.#surveyRepository = surveyRepository;
  }

  async execute(surveyId) {
    const survey = await this.#surveyRepository.findById(surveyId);
    if (!survey) {
      throw new EntityNotFoundError('Survey', surveyId);
    }

    survey.toggleStatus();
    await this.#surveyRepository.save(survey);

    return survey;
  }
}
