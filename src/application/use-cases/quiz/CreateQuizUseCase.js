import { Quiz } from '../../../domain/entities/Quiz.js';
import { Question } from '../../../domain/entities/Question.js';
import { Option } from '../../../domain/entities/Option.js';

export class CreateQuizUseCase {
  #quizRepository;

  constructor(quizRepository) {
    this.#quizRepository = quizRepository;
  }

  async execute(dto) {
    dto.validate();

    const quiz = new Quiz(undefined, dto.title, dto.description);

    for (const qData of dto.questions) {
      const question = new Question(
        undefined,
        quiz.id,
        qData.text,
        qData.points !== undefined ? qData.points : 1,
      );

      for (const optData of qData.options) {
        question.addOption(new Option(undefined, optData.text, optData.isCorrect));
      }

      quiz.addQuestion(question);
    }

    quiz.validateCompleteness();

    await this.#quizRepository.save(quiz);

    return quiz;
  }
}
