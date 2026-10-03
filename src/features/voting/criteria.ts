/**
 * I quattro parametri di voto. Testi e chiavi stanno qui, non nei componenti:
 * per cambiare una descrizione basta modificare questo file.
 */
export const CRITERIA = [
  {
    key: 'taste',
    column: 'taste_score',
    title: 'Gusto',
    short: 'Gusto',
    question: 'Quanto è buona?',
    levels: ['Non mi piace', 'Poco buona', 'Buona', 'Molto buona', 'Eccezionale'],
    note: null,
  },
  {
    key: 'rewant',
    column: 'rewant_score',
    title: 'Voglia di rimangiarla',
    short: 'Voglia di rimangiarla',
    question: 'Ne mangeresti un’altra fetta?',
    levels: [
      'Non ne mangerei un’altra fetta',
      'Difficilmente ne mangerei ancora',
      'Ne mangerei ancora senza problemi',
      'Ne mangerei molto volentieri un’altra fetta',
      'Ne vorrei immediatamente un’altra',
    ],
    note: null,
  },
  {
    key: 'idea',
    column: 'idea_score',
    title: 'Idea del gusto',
    short: 'Idea',
    question: 'L’abbinamento è pensato bene e ha senso sulla pizza?',
    levels: [
      'Abbinamento che non funziona',
      'Idea debole o poco convincente',
      'Idea valida',
      'Idea molto riuscita e interessante',
      'Idea eccezionale: coerente, interessante e pensata benissimo',
    ],
    note: 'Conta quanto è azzeccata, non quanto è strana: anche una combinazione semplice può valere 5.',
  },
  {
    key: 'smell',
    column: 'smell_score',
    title: 'Odore',
    short: 'Odore',
    question: 'Che profumo ha?',
    levels: [
      'Poco invitante o sgradevole',
      'Debole o poco piacevole',
      'Piacevole',
      'Molto invitante e appetitoso',
      'Profumo eccezionale: fa venire subito voglia di mangiarla',
    ],
    note: null,
  },
] as const;

export type CriterionKey = (typeof CRITERIA)[number]['key'];
export type Scores = Record<CriterionKey, number>;

export const CRITERION_KEYS = CRITERIA.map((c) => c.key) as CriterionKey[];

export function isCompleteScores(value: Partial<Record<string, unknown>>): value is Scores {
  return CRITERION_KEYS.every((k) => Number.isInteger(value[k]) && (value[k] as number) >= 1 && (value[k] as number) <= 5);
}
