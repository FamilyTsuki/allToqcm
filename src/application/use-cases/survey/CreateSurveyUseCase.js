import { Survey } from '../../../domain/entities/Survey.js';
import { Question } from '../../../domain/entities/Question.js';

export class CreateSurveyUseCase {
  #surveyRepository;

  constructor(surveyRepository) {
    this.#surveyRepository = surveyRepository;
  }

  async execute(dto) {
    dto.validate();

    const survey = new Survey(undefined, dto.title, dto.description);

    for (const qData of dto.questions) {
      const text = typeof qData === 'string' ? qData : qData.text;
      const optionsData = qData?.options;

      const question = new Question(
        undefined,
        survey.id,
        text,
        Array.isArray(optionsData) && optionsData.length > 0
          ? optionsData.map((opt) => (typeof opt === 'string' ? opt : opt.text))
          : null,
        qData?.imageUrl || null,
        qData?.type || 'scale',
      );

      survey.addQuestion(question);
    }

    survey.validate();
    await this.#surveyRepository.save(survey);

    return survey;
  }
}
