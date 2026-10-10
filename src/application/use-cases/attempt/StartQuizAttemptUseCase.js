import { EntityNotFoundError } from '../../../domain/errors/EntityNotFoundError.js';
import { QuizAttempt } from '../../../domain/entities/QuizAttempt.js';

export class StartQuizAttemptUseCase {
  #quizRepository;
  #quizAttemptRepository;

  constructor(quizRepository, quizAttemptRepository) {
    this.#quizRepository = quizRepository;
    this.#quizAttemptRepository = quizAttemptRepository;
  }

  async execute(quizId, participantName) {
    const quiz = await this.#quizRepository.findById(quizId);
    if (!quiz) {
      throw new EntityNotFoundError('Quiz', quizId);
    }

    quiz.validateCompleteness();

    const attempt = new QuizAttempt(undefined, quiz.id, participantName);
    await this.#quizAttemptRepository.save(attempt);

    const sanitizedQuestions = quiz.questions.map((q) => ({
      id: q.id,
      text: q.text,
      points: q.points,
      options: q.options.map((opt) => ({
        id: opt.id,
        text: opt.text,
      })),
    }));

    return {
      attempt: attempt.toJSON(),
      quiz: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        totalPoints: quiz.totalPoints,
        questions: sanitizedQuestions,
      },
    };
  }
}
