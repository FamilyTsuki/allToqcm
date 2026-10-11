import { EntityNotFoundError } from '../../../domain/errors/EntityNotFoundError.js';
import { ValidationError } from '../../../domain/errors/ValidationError.js';
import { SurveyResponse } from '../../../domain/entities/SurveyResponse.js';
import { SurveyAnswer } from '../../../domain/entities/SurveyAnswer.js';

export class SubmitSurveyResponseUseCase {
  #surveyRepository;
  #responseRepository;

  constructor(surveyRepository, responseRepository) {
    this.#surveyRepository = surveyRepository;
    this.#responseRepository = responseRepository;
  }

  async execute(surveyId, dto) {
    dto.validate();

    const survey = await this.#surveyRepository.findById(surveyId);
    if (!survey) {
      throw new EntityNotFoundError('Survey', surveyId);
    }

    if (survey.isClosed) {
      throw new ValidationError('Ce questionnaire est clôturé et n’accepte plus de réponses');
    }

    for (const ans of dto.answers) {
      const question = survey.questions.find((q) => q.id === ans.questionId);
      if (!question) {
        throw new ValidationError(`Question non trouvée dans le questionnaire: ${ans.questionId}`);
      }
      for (const optId of ans.selectedOptionIds) {
        const optionExists = question.options.some((opt) => opt.id === optId);
        if (!optionExists) {
          throw new ValidationError(`Option non valide pour la question: ${optId}`);
        }
      }
    }

    const answers = dto.answers.map((a) => new SurveyAnswer(a.questionId, a.selectedOptionIds));

    const response = new SurveyResponse(undefined, survey.id, dto.participantName, answers);

    await this.#responseRepository.save(response);

    return response;
  }
}
