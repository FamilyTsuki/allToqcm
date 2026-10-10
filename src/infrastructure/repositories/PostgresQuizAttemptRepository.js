import { QuizAttemptRepository } from '../../domain/repositories/QuizAttemptRepository.js';
import { QuizAttempt } from '../../domain/entities/QuizAttempt.js';
import { AttemptAnswer } from '../../domain/entities/AttemptAnswer.js';
import { Score } from '../../domain/value-objects/Score.js';

export class PostgresQuizAttemptRepository extends QuizAttemptRepository {
  #db;

  constructor(db) {
    super();
    this.#db = db;
  }

  async save(quizAttempt) {
    const client = await this.#db.getClient();
    try {
      await client.query('BEGIN');

      await client.query(
        'INSERT INTO quiz_attempts (id, quiz_id, participant_name, started_at, completed_at, points_earned, total_points, percentage) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [
          quizAttempt.id,
          quizAttempt.quizId,
          quizAttempt.participantName,
          quizAttempt.startedAt,
          quizAttempt.completedAt,
          quizAttempt.score ? quizAttempt.score.pointsEarned : null,
          quizAttempt.score ? quizAttempt.score.totalPoints : null,
          quizAttempt.score ? quizAttempt.score.percentage : null,
        ],
      );

      for (const answer of quizAttempt.answers) {
        await client.query(
          'INSERT INTO attempt_answers (attempt_id, question_id, selected_option_ids) VALUES ($1, $2, $3)',
          [quizAttempt.id, answer.questionId, answer.selectedOptionIds],
        );
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
    const attemptResult = await this.#db.query('SELECT * FROM quiz_attempts WHERE id = $1', [id]);
    if (attemptResult.rows.length === 0) {
      return null;
    }

    const row = attemptResult.rows[0];

    const answersResult = await this.#db.query(
      'SELECT question_id, selected_option_ids FROM attempt_answers WHERE attempt_id = $1',
      [id],
    );

    const answers = answersResult.rows.map(
      (ansRow) => new AttemptAnswer(ansRow.question_id, ansRow.selected_option_ids),
    );

    let score = null;
    if (row.points_earned !== null && row.total_points !== null) {
      score = new Score(Number(row.points_earned), Number(row.total_points));
    }

    return new QuizAttempt(
      row.id,
      row.quiz_id,
      row.participant_name,
      answers,
      score,
      new Date(row.started_at),
      row.completed_at ? new Date(row.completed_at) : null,
    );
  }

  async findByQuizId(quizId) {
    const result = await this.#db.query(
      'SELECT id FROM quiz_attempts WHERE quiz_id = $1 ORDER BY started_at DESC',
      [quizId],
    );

    const attempts = [];
    for (const row of result.rows) {
      const attempt = await this.findById(row.id);
      if (attempt) {
        attempts.push(attempt);
      }
    }

    return attempts;
  }

  async update(quizAttempt) {
    const client = await this.#db.getClient();
    try {
      await client.query('BEGIN');

      await client.query(
        'UPDATE quiz_attempts SET completed_at = $1, points_earned = $2, total_points = $3, percentage = $4 WHERE id = $5',
        [
          quizAttempt.completedAt,
          quizAttempt.score ? quizAttempt.score.pointsEarned : null,
          quizAttempt.score ? quizAttempt.score.totalPoints : null,
          quizAttempt.score ? quizAttempt.score.percentage : null,
          quizAttempt.id,
        ],
      );

      await client.query('DELETE FROM attempt_answers WHERE attempt_id = $1', [quizAttempt.id]);

      for (const answer of quizAttempt.answers) {
        await client.query(
          'INSERT INTO attempt_answers (attempt_id, question_id, selected_option_ids) VALUES ($1, $2, $3)',
          [quizAttempt.id, answer.questionId, answer.selectedOptionIds],
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
