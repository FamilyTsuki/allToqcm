import test from 'node:test';
import assert from 'node:assert/strict';
import { QuizRepository } from '../src/domain/repositories/QuizRepository.js';
import { QuizAttemptRepository } from '../src/domain/repositories/QuizAttemptRepository.js';
import { CreateQuizDTO } from '../src/application/dtos/CreateQuizDTO.js';
import { SubmitAttemptDTO } from '../src/application/dtos/SubmitAttemptDTO.js';
import { CreateQuizUseCase } from '../src/application/use-cases/quiz/CreateQuizUseCase.js';
import { GetQuizByIdUseCase } from '../src/application/use-cases/quiz/GetQuizByIdUseCase.js';
import { ListQuizzesUseCase } from '../src/application/use-cases/quiz/ListQuizzesUseCase.js';
import { UpdateQuizUseCase } from '../src/application/use-cases/quiz/UpdateQuizUseCase.js';
import { DeleteQuizUseCase } from '../src/application/use-cases/quiz/DeleteQuizUseCase.js';
import { AddQuestionUseCase } from '../src/application/use-cases/quiz/AddQuestionUseCase.js';
import { RemoveQuestionUseCase } from '../src/application/use-cases/quiz/RemoveQuestionUseCase.js';
import { StartQuizAttemptUseCase } from '../src/application/use-cases/attempt/StartQuizAttemptUseCase.js';
import { SubmitQuizAttemptUseCase } from '../src/application/use-cases/attempt/SubmitQuizAttemptUseCase.js';
import { GetAttemptResultUseCase } from '../src/application/use-cases/attempt/GetAttemptResultUseCase.js';
import { EntityNotFoundError } from '../src/domain/errors/EntityNotFoundError.js';

class InMemoryQuizRepository extends QuizRepository {
  #quizzes = new Map();

  async save(quiz) {
    this.#quizzes.set(quiz.id, quiz);
  }

  async findById(id) {
    return this.#quizzes.get(id) || null;
  }

  async findAll() {
    return Array.from(this.#quizzes.values());
  }

  async update(quiz) {
    this.#quizzes.set(quiz.id, quiz);
  }

  async delete(id) {
    this.#quizzes.delete(id);
  }
}

class InMemoryQuizAttemptRepository extends QuizAttemptRepository {
  #attempts = new Map();

  async save(attempt) {
    this.#attempts.set(attempt.id, attempt);
  }

  async findById(id) {
    return this.#attempts.get(id) || null;
  }

  async findByQuizId(quizId) {
    return Array.from(this.#attempts.values()).filter((a) => a.quizId === quizId);
  }

  async update(attempt) {
    this.#attempts.set(attempt.id, attempt);
  }
}

test('Creator use cases manage quizzes lifecycle', async () => {
  const quizRepo = new InMemoryQuizRepository();
  const createUseCase = new CreateQuizUseCase(quizRepo);
  const getByIdUseCase = new GetQuizByIdUseCase(quizRepo);
  const listUseCase = new ListQuizzesUseCase(quizRepo);
  const updateUseCase = new UpdateQuizUseCase(quizRepo);
  const addQuestionUseCase = new AddQuestionUseCase(quizRepo);
  const removeQuestionUseCase = new RemoveQuestionUseCase(quizRepo);
  const deleteUseCase = new DeleteQuizUseCase(quizRepo);

  const dto = new CreateQuizDTO({
    title: 'JavaScript Fundamentals',
    description: 'Basic JS quiz',
    questions: [
      {
        text: 'What does typeof null return?',
        points: 2,
        options: [
          { text: 'null', isCorrect: false },
          { text: 'object', isCorrect: true },
        ],
      },
    ],
  });

  const createdQuiz = await createUseCase.execute(dto);
  assert.equal(createdQuiz.title, 'JavaScript Fundamentals');
  assert.equal(createdQuiz.totalPoints, 2);

  const foundQuiz = await getByIdUseCase.execute(createdQuiz.id);
  assert.equal(foundQuiz.id, createdQuiz.id);

  const allQuizzes = await listUseCase.execute();
  assert.equal(allQuizzes.length, 1);

  await updateUseCase.execute(createdQuiz.id, {
    title: 'Advanced JS',
    description: 'Advanced topics',
  });
  const updatedQuiz = await getByIdUseCase.execute(createdQuiz.id);
  assert.equal(updatedQuiz.title, 'Advanced JS');

  const newQuestion = await addQuestionUseCase.execute(createdQuiz.id, {
    text: 'Is JS single threaded?',
    points: 1,
    options: [
      { text: 'Yes', isCorrect: true },
      { text: 'No', isCorrect: false },
    ],
  });
  assert.equal(newQuestion.text, 'Is JS single threaded?');

  const quizWithTwoQuestions = await getByIdUseCase.execute(createdQuiz.id);
  assert.equal(quizWithTwoQuestions.questions.length, 2);

  await removeQuestionUseCase.execute(createdQuiz.id, newQuestion.id);
  const quizWithOneQuestion = await getByIdUseCase.execute(createdQuiz.id);
  assert.equal(quizWithOneQuestion.questions.length, 1);

  await deleteUseCase.execute(createdQuiz.id);
  await assert.rejects(() => getByIdUseCase.execute(createdQuiz.id), EntityNotFoundError);
});

test('Runner use cases handle attempt start, evaluation and result retrieval', async () => {
  const quizRepo = new InMemoryQuizRepository();
  const attemptRepo = new InMemoryQuizAttemptRepository();

  const createQuizUseCase = new CreateQuizUseCase(quizRepo);
  const startAttemptUseCase = new StartQuizAttemptUseCase(quizRepo, attemptRepo);
  const submitAttemptUseCase = new SubmitQuizAttemptUseCase(quizRepo, attemptRepo);
  const getResultUseCase = new GetAttemptResultUseCase(attemptRepo);

  const quiz = await createQuizUseCase.execute(
    new CreateQuizDTO({
      title: 'Math Quiz',
      questions: [
        {
          text: '2 + 2 = ?',
          points: 5,
          options: [
            { text: '3', isCorrect: false },
            { text: '4', isCorrect: true },
          ],
        },
      ],
    }),
  );

  const session = await startAttemptUseCase.execute(quiz.id, 'Bob');
  assert.equal(session.attempt.participantName, 'Bob');
  assert.equal(session.quiz.questions.length, 1);
  assert.equal(session.quiz.questions[0].options[0].isCorrect, undefined);

  const questionId = quiz.questions[0].id;
  const correctOptionId = quiz.questions[0].getCorrectOptionIds()[0];

  const submitDTO = new SubmitAttemptDTO({
    answers: [
      {
        questionId,
        selectedOptionIds: [correctOptionId],
      },
    ],
  });

  const completedAttempt = await submitAttemptUseCase.execute(session.attempt.id, submitDTO);
  assert.equal(completedAttempt.isCompleted, true);
  assert.equal(completedAttempt.score.pointsEarned, 5);
  assert.equal(completedAttempt.score.totalPoints, 5);
  assert.equal(completedAttempt.score.percentage, 100);

  const retrieved = await getResultUseCase.execute(session.attempt.id);
  assert.equal(retrieved.id, session.attempt.id);
  assert.equal(retrieved.score.pointsEarned, 5);
});

