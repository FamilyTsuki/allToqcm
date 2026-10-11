export class ListSurveysUseCase {
  #surveyRepository;

  constructor(surveyRepository) {
    this.#surveyRepository = surveyRepository;
  }

  async execute() {
    return this.#surveyRepository.findAll();
  }
}
