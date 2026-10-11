import { EntityNotFoundError } from '../../../domain/errors/EntityNotFoundError.js';

export class GetSurveyByIdUseCase {
  #surveyRepository;

  constructor(surveyRepository) {
    this.#surveyRepository = surveyRepository;
  }

  async execute(surveyId) {
    const survey = await this.#surveyRepository.findById(surveyId);
    if (!survey) {
      throw new EntityNotFoundError('Survey', surveyId);
    }
    return survey;
  }
}
