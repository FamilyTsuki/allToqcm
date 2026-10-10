import { QuizRepository } from '../../domain/repositories/QuizRepository.js';
import { Quiz } from '../../domain/entities/Quiz.js';
import { Question } from '../../domain/entities/Question.js';
import { Option } from '../../domain/entities/Option.js';

export class PostgresQuizRepository extends QuizRepository {
  #db;

  constructor(db) {
    super();
    this.#db = db;
  }

  async save(quiz) {
    const client = await this.#db.getClient();
    try {
      await client.query('BEGIN');

      await client.query(
        'INSERT INTO quizzes (id, title, description, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)',
        [quiz.id, quiz.title, quiz.description, quiz.createdAt, quiz.updatedAt],
      );

      for (const question of quiz.questions) {
        await client.query(
          'INSERT INTO questions (id, quiz_id, text, points) VALUES ($1, $2, $3, $4)',
          [question.id, quiz.id, question.text, question.points],
        );

        for (const option of question.options) {
          await client.query(
            'INSERT INTO options (id, question_id, text, is_correct) VALUES ($1, $2, $3, $4)',
            [option.id, question.id, option.text, option.isCorrect],
          );
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findById(id) {
    const quizResult = await this.#db.query('SELECT * FROM quizzes WHERE id = $1', [id]);
    if (quizResult.rows.length === 0) {
      return null;
    }

    const quizRow = quizResult.rows[0];

    const questionsResult = await this.#db.query(
      'SELECT * FROM questions WHERE quiz_id = $1 ORDER BY id ASC',
      [id],
    );

    const questions = [];

    for (const qRow of questionsResult.rows) {
      const optionsResult = await this.#db.query(
        'SELECT * FROM options WHERE question_id = $1 ORDER BY id ASC',
        [qRow.id],
      );

      const options = optionsResult.rows.map(
        (optRow) => new Option(optRow.id, optRow.text, optRow.is_correct),
      );

      questions.push(new Question(qRow.id, qRow.quiz_id, qRow.text, Number(qRow.points), options));
    }

    return new Quiz(
      quizRow.id,
      quizRow.title,
      quizRow.description,
      questions,
      new Date(quizRow.created_at),
      new Date(quizRow.updated_at),
    );
  }

  async findAll() {
    const result = await this.#db.query('SELECT id FROM quizzes ORDER BY created_at DESC');
    const quizzes = [];

    for (const row of result.rows) {
      const quiz = await this.findById(row.id);
      if (quiz) {
        quizzes.push(quiz);
      }
    }

    return quizzes;
  }

  async update(quiz) {
    const client = await this.#db.getClient();
    try {
      await client.query('BEGIN');

      await client.query(
        'UPDATE quizzes SET title = $1, description = $2, updated_at = $3 WHERE id = $4',
        [quiz.title, quiz.description, quiz.updatedAt, quiz.id],
      );

      await client.query('DELETE FROM questions WHERE quiz_id = $1', [quiz.id]);

      for (const question of quiz.questions) {
        await client.query(
          'INSERT INTO questions (id, quiz_id, text, points) VALUES ($1, $2, $3, $4)',
          [question.id, quiz.id, question.text, question.points],
        );

        for (const option of question.options) {
          await client.query(
            'INSERT INTO options (id, question_id, text, is_correct) VALUES ($1, $2, $3, $4)',
            [option.id, question.id, option.text, option.isCorrect],
          );
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async delete(id) {
    await this.#db.query('DELETE FROM quizzes WHERE id = $1', [id]);
  }
}
