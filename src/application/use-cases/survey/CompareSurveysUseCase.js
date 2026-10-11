import { EntityNotFoundError } from '../../../domain/errors/EntityNotFoundError.js';

export class CompareSurveysUseCase {
  #getSurveyStatsUseCase;

  constructor(getSurveyStatsUseCase) {
    this.#getSurveyStatsUseCase = getSurveyStatsUseCase;
  }

  async execute(surveyIdA, surveyIdB) {
    if (!surveyIdA || !surveyIdB) {
      throw new EntityNotFoundError('Survey', 'Identifiants requis');
    }

    const statsA = await this.#getSurveyStatsUseCase.execute(surveyIdA);
    const statsB = await this.#getSurveyStatsUseCase.execute(surveyIdB);

    const deltaResponses = statsB.totalResponses - statsA.totalResponses;
    const deltaGlobalScore =
      Math.round((statsB.globalAverageScore - statsA.globalAverageScore) * 10) / 10;

    const comparisons = statsB.questions.map((qB, index) => {
      const qA =
        statsA.questions.find(
          (candidate) => candidate.text.trim().toLowerCase() === qB.text.trim().toLowerCase(),
        ) || statsA.questions[index];

      const scoreA = qA ? qA.averageScore || 0 : null;
      const scoreB = qB.averageScore || 0;
      const deltaScore = scoreA !== null ? Math.round((scoreB - scoreA) * 10) / 10 : null;

      return {
        questionText: qB.text,
        type: qB.type,
        scoreA,
        scoreB,
        deltaScore,
      };
    });

    return {
      surveyA: statsA.survey,
      surveyB: statsB.survey,
      totalResponsesA: statsA.totalResponses,
      totalResponsesB: statsB.totalResponses,
      deltaResponses,
      globalScoreA: statsA.globalAverageScore,
      globalScoreB: statsB.globalAverageScore,
      deltaGlobalScore,
      comparisons,
    };
  }
}
