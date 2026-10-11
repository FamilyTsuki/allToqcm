import { SubmitResponseDTO } from '../../application/dtos/SubmitResponseDTO.js';

export class SurveyRespondentController {
  #listSurveysUseCase;
  #getSurveyByIdUseCase;
  #submitSurveyResponseUseCase;

  constructor({ listSurveysUseCase, getSurveyByIdUseCase, submitSurveyResponseUseCase }) {
    this.#listSurveysUseCase = listSurveysUseCase;
    this.#getSurveyByIdUseCase = getSurveyByIdUseCase;
    this.#submitSurveyResponseUseCase = submitSurveyResponseUseCase;

    this.listSurveys = this.listSurveys.bind(this);
    this.getSurvey = this.getSurvey.bind(this);
    this.submitResponse = this.submitResponse.bind(this);
  }

  async listSurveys(_req, res, next) {
    try {
      const surveys = await this.#listSurveysUseCase.execute();
      const summary = surveys.map((s) => ({
        ...s.toJSON(),
        questionCount: s.questions.length,
      }));
      res.status(200).json(summary);
    } catch (error) {
      next(error);
    }
  }

  async getSurvey(req, res, next) {
    try {
      const survey = await this.#getSurveyByIdUseCase.execute(req.params.id);
      res.status(200).json(survey.toJSON());
    } catch (error) {
      next(error);
    }
  }

  async submitResponse(req, res, next) {
    try {
      const dto = SubmitResponseDTO.fromJSON(req.body);
      const response = await this.#submitSurveyResponseUseCase.execute(req.params.id, dto);
      res.status(201).json(response.toJSON());
    } catch (error) {
      next(error);
    }
  }
}
