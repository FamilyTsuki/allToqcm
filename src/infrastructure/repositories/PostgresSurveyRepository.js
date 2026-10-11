import { SurveyRepository } from '../../domain/repositories/SurveyRepository.js';
import { Survey } from '../../domain/entities/Survey.js';
import { Question } from '../../domain/entities/Question.js';
import { Option } from '../../domain/entities/Option.js';

export class PostgresSurveyRepository extends SurveyRepository {
  #db;

  constructor(db) {
    super();
    this.#db = db;
  }

  async save(survey) {
    const client = await this.#db.getClient();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO surveys (id, title, description, is_closed, created_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE
         SET title = EXCLUDED.title,
             description = EXCLUDED.description,
             is_closed = EXCLUDED.is_closed`,
        [survey.id, survey.title, survey.description, survey.isClosed, survey.createdAt],
      );

      for (const question of survey.questions) {
        await client.query(
          `INSERT INTO questions (id, survey_id, text, image_url, type)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO UPDATE
           SET text = EXCLUDED.text,
               image_url = EXCLUDED.image_url,
               type = EXCLUDED.type`,
          [question.id, survey.id, question.text, question.imageUrl, question.type],
        );

        for (let i = 0; i < question.options.length; i++) {
          const option = question.options[i];
          await client.query(
            `INSERT INTO options (id, question_id, text, order_index)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (id) DO UPDATE
             SET text = EXCLUDED.text,
                 order_index = EXCLUDED.order_index`,
            [option.id, question.id, option.text, i],
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

  async #loadQuestions(surveyId) {
    const questionsResult = await this.#db.query(
      'SELECT * FROM questions WHERE survey_id = $1 ORDER BY id ASC',
      [surveyId],
    );

    const questions = [];

    for (const qRow of questionsResult.rows) {
      const optionsResult = await this.#db.query(
        'SELECT * FROM options WHERE question_id = $1 ORDER BY order_index ASC',
        [qRow.id],
      );

      const options = optionsResult.rows.map((optRow) => new Option(optRow.id, optRow.text));

      questions.push(
        new Question(qRow.id, qRow.survey_id, qRow.text, options, qRow.image_url, qRow.type),
      );
    }

    return questions;
  }

  #mapRowToSurvey(row, questions) {
    return new Survey(
      row.id,
      row.title,
      row.description,
      questions,
      new Date(row.created_at),
      Boolean(row.is_closed),
    );
  }

  async findById(id) {
    const surveyResult = await this.#db.query('SELECT * FROM surveys WHERE id = $1', [id]);
    if (surveyResult.rows.length === 0) {
      return null;
    }

    const questions = await this.#loadQuestions(id);
    return this.#mapRowToSurvey(surveyResult.rows[0], questions);
  }

  async findAll() {
    const result = await this.#db.query('SELECT id FROM surveys ORDER BY created_at DESC');
    const surveys = [];

    for (const row of result.rows) {
      const survey = await this.findById(row.id);
      if (survey) {
        surveys.push(survey);
      }
    }

    return surveys;
  }

  async delete(id) {
    await this.#db.query('DELETE FROM surveys WHERE id = $1', [id]);
  }
}
