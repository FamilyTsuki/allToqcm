import { EntityNotFoundError } from '../../../domain/errors/EntityNotFoundError.js';
import { AttemptAnswer } from '../../../domain/entities/AttemptAnswer.js';
import { Score } from '../../../domain/value-objects/Score.js';

export class SubmitQuizAttemptUseCase {
  #quizRepository;
  #quizAttemptRepository;

  constructor(quizRepository, quizAttemptRepository) {
    this.#quizRepository = quizRepository;
    this.#quizAttemptRepository = quizAttemptRepository;
  }

  async execute(attemptId, submitAttemptDTO) {
    submitAttemptDTO.validate();

    const attempt = await this.#quizAttemptRepository.findById(attemptId);
    if (!attempt) {
      throw new EntityNotFoundError('QuizAttempt', attemptId);
    }

    const quiz = await this.#quizRepository.findById(attempt.quizId);
    if (!quiz) {
      throw new EntityNotFoundError('Quiz', attempt.quizId);
    }

    let earnedPoints = 0;
    const answerMap = new Map();

    for (const ans of submitAttemptDTO.answers) {
      answerMap.set(ans.questionId, ans.selectedOptionIds);
      attempt.recordAnswer(new AttemptAnswer(ans.questionId, ans.selectedOptionIds));
    }

    for (const question of quiz.questions) {
      const selectedOptionIds = answerMap.get(question.id) || [];
      const points = question.evaluateAnswers(selectedOptionIds);
      earnedPoints += points;
    }

    const totalPoints = quiz.totalPoints;
    const score = new Score(earnedPoints, totalPoints);

    attempt.complete(score);
    await this.#quizAttemptRepository.update(attempt);

    return attempt;
  }
}
