import { EntityNotFoundError } from '../../../domain/errors/EntityNotFoundError.js';
import { QUESTION_TYPES } from '../../../domain/entities/Question.js';

export class GetSurveyStatsUseCase {
  #surveyRepository;
  #responseRepository;

  constructor(surveyRepository, responseRepository) {
    this.#surveyRepository = surveyRepository;
    this.#responseRepository = responseRepository;
  }

  async execute(surveyId) {
    const survey = await this.#surveyRepository.findById(surveyId);
    if (!survey) {
      throw new EntityNotFoundError('Survey', surveyId);
    }

    const responses = await this.#responseRepository.findBySurveyId(surveyId);
    const totalResponses = responses.length;

    let totalScoreSum = 0;
    let scoredQuestionsCount = 0;

    const questionStats = survey.questions.map((question) => {
      if (question.type === QUESTION_TYPES.RANKING) {
        return this.#calculateRankingStats(question, responses, totalResponses);
      }

      const { stats, hasVotes, averageScore } = this.#calculateScaleStats(
        question,
        responses,
        totalResponses,
      );

      if (hasVotes) {
        totalScoreSum += averageScore;
        scoredQuestionsCount++;
      }

      return stats;
    });

    const globalAverageScore =
      scoredQuestionsCount > 0 ? this.#round(totalScoreSum / scoredQuestionsCount, 1) : 0;

    return {
      survey: {
        id: survey.id,
        title: survey.title,
        description: survey.description,
      },
      totalResponses,
      globalAverageScore,
      questions: questionStats,
    };
  }

  #round(value, decimals = 1) {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  }

  #calculatePercentage(part, total) {
    if (total <= 0) {
      return 0;
    }
    return this.#round((part / total) * 100, 2);
  }

  #calculateRankingStats(question, responses, totalResponses) {
    const optionPoints = new Map();
    const optionRankSum = new Map();
    const optionRankCount = new Map();

    for (const opt of question.options) {
      optionPoints.set(opt.id, 0);
      optionRankSum.set(opt.id, 0);
      optionRankCount.set(opt.id, 0);
    }

    const maxRankScore = question.options.length;

    for (const res of responses) {
      const answer = res.answers.find((a) => a.questionId === question.id);
      if (answer && Array.isArray(answer.selectedOptionIds)) {
        answer.selectedOptionIds.forEach((optId, index) => {
          if (optionPoints.has(optId)) {
            const points = Math.max(1, maxRankScore - index);
            optionPoints.set(optId, optionPoints.get(optId) + points);
            optionRankSum.set(optId, optionRankSum.get(optId) + (index + 1));
            optionRankCount.set(optId, optionRankCount.get(optId) + 1);
          }
        });
      }
    }

    const maxPossiblePoints = totalResponses * maxRankScore;

    const options = question.options
      .map((opt) => {
        const points = optionPoints.get(opt.id) || 0;
        const rankSum = optionRankSum.get(opt.id) || 0;
        const rankCount = optionRankCount.get(opt.id) || 0;
        const averageRank = rankCount > 0 ? this.#round(rankSum / rankCount, 1) : 0;
        const percentage = this.#calculatePercentage(points, maxPossiblePoints);

        return {
          id: opt.id,
          text: opt.text,
          points,
          averageRank,
          percentage,
          votes: points,
        };
      })
      .sort((a, b) => b.points - a.points);

    return {
      id: question.id,
      text: question.text,
      type: QUESTION_TYPES.RANKING,
      imageUrl: question.imageUrl,
      options,
    };
  }

  #calculateScaleStats(question, responses, totalResponses) {
    const optionVoteCounts = new Map();
    for (const opt of question.options) {
      optionVoteCounts.set(opt.id, 0);
    }

    for (const res of responses) {
      const answer = res.answers.find((a) => a.questionId === question.id);
      if (answer && Array.isArray(answer.selectedOptionIds)) {
        for (const optId of answer.selectedOptionIds) {
          if (optionVoteCounts.has(optId)) {
            optionVoteCounts.set(optId, optionVoteCounts.get(optId) + 1);
          }
        }
      }
    }

    let questionWeightSum = 0;
    let questionVoteSum = 0;

    const options = question.options.map((opt, idx) => {
      const votes = optionVoteCounts.get(opt.id) || 0;
      const weight = idx + 1;
      questionWeightSum += votes * weight;
      questionVoteSum += votes;

      const percentage = this.#calculatePercentage(votes, totalResponses);

      return {
        id: opt.id,
        text: opt.text,
        votes,
        percentage,
      };
    });

    const averageScore =
      questionVoteSum > 0 ? this.#round(questionWeightSum / questionVoteSum, 1) : 0;

    return {
      stats: {
        id: question.id,
        text: question.text,
        type: QUESTION_TYPES.SCALE,
        imageUrl: question.imageUrl,
        averageScore,
        options,
      },
      hasVotes: questionVoteSum > 0,
      averageScore,
    };
  }
}
