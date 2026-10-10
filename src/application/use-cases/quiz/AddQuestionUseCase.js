import { EntityNotFoundError } from '../../../domain/errors/EntityNotFoundError.js';
import { Question } from '../../../domain/entities/Question.js';
import { Option } from '../../../domain/entities/Option.js';

export class AddQuestionUseCase {
  #quizRepository;

  constructor(quizRepository) {
    this.#quizRepository = quizRepository;
  }

  async execute(quizId, questionData) {
    const quiz = await this.#quizRepository.findById(quizId);
    if (!quiz) {
      throw new EntityNotFoundError('Quiz', quizId);
    }

    const question = new Question(
      undefined,
      quiz.id,
      questionData.text,
      questionData.points !== undefined ? questionData.points : 1,
    );

    if (Array.isArray(questionData.options)) {
      for (const opt of questionData.options) {
        question.addOption(new Option(undefined, opt.text, opt.isCorrect));
      }
    }

    quiz.addQuestion(question);
    await this.#quizRepository.update(quiz);

    return question;
  }
}
