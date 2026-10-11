export class SurveyCsvPresenter {
  static #escape(value) {
    return String(value ?? '').replace(/"/g, '""');
  }

  static toCsv(stats) {
    const lines = ['Question;Option;Votes;Pourcentage'];

    for (const question of stats.questions) {
      for (const option of question.options) {
        const escapedQuestion = this.#escape(question.text);
        const escapedOption = this.#escape(option.text);
        lines.push(`"${escapedQuestion}";"${escapedOption}";${option.votes};${option.percentage}%`);
      }
    }

    return '\uFEFF' + lines.join('\r\n');
  }
}

