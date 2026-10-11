import { EntityNotFoundError } from '../../../domain/errors/EntityNotFoundError.js';
import { Survey } from '../../../domain/entities/Survey.js';

export class DuplicateSurveyUseCase {
  #surveyRepository;

  constructor(surveyRepository) {
    this.#surveyRepository = surveyRepository;
  }

  async execute(surveyId) {
    const original = await this.#surveyRepository.findById(surveyId);
    if (!original) {
      throw new EntityNotFoundError('Survey', surveyId);
    }

    const duplicatedQuestions = original.questions.map((q) => ({
      text: q.text,
      options: q.options.map((opt) => opt.text),
      imageUrl: q.imageUrl,
      type: q.type,
    }));
    const duplicate = new Survey(
      undefined,
      `[Copie] ${original.title}`,
      original.description,
      duplicatedQuestions,
    );

    duplicate.validate();
    await this.#surveyRepository.save(duplicate);

    return duplicate;
  }
}
