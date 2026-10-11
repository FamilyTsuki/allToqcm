import { SurveyResponseRepository } from '../../domain/repositories/SurveyResponseRepository.js';
import { SurveyResponse } from '../../domain/entities/SurveyResponse.js';
import { SurveyAnswer } from '../../domain/entities/SurveyAnswer.js';

export class PostgresSurveyResponseRepository extends SurveyResponseRepository {
  #db;

  constructor(db) {
    super();
    this.#db = db;
  }

  async save(response) {
    const client = await this.#db.getClient();
    try {
      await client.query('BEGIN');

      await client.query(
        'INSERT INTO responses (id, survey_id, participant_name, submitted_at) VALUES ($1, $2, $3, $4)',
        [response.id, response.surveyId, response.participantName, response.submittedAt],
      );

      for (const answer of response.answers) {
        await client.query(
          'INSERT INTO response_answers (response_id, question_id, selected_option_ids) VALUES ($1, $2, $3)',
          [response.id, answer.questionId, answer.selectedOptionIds],
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

  async #loadAnswers(responseId) {
    const answersResult = await this.#db.query(
      'SELECT question_id, selected_option_ids FROM response_answers WHERE response_id = $1',
      [responseId],
    );

    return answersResult.rows.map(
      (ansRow) => new SurveyAnswer(ansRow.question_id, ansRow.selected_option_ids),
    );
  }

  #mapRowToResponse(row, answers) {
    return new SurveyResponse(
      row.id,
      row.survey_id,
      row.participant_name,
      answers,
      new Date(row.submitted_at),
    );
  }

  async findById(id) {
    const resResult = await this.#db.query('SELECT * FROM responses WHERE id = $1', [id]);
    if (resResult.rows.length === 0) {
      return null;
    }

    const answers = await this.#loadAnswers(id);
    return this.#mapRowToResponse(resResult.rows[0], answers);
  }

  async findBySurveyId(surveyId) {
    const result = await this.#db.query(
      'SELECT id FROM responses WHERE survey_id = $1 ORDER BY submitted_at DESC',
      [surveyId],
    );

    const responses = [];
    for (const row of result.rows) {
      const response = await this.findById(row.id);
      if (response) {
        responses.push(response);
      }
    }

    return responses;
  }
}
