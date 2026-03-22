import { describe, it, expect } from 'vitest';
import { calcDailyScore, compareDailyScores } from './scoring';

// Partida perfecta de referencia: 12/12 en 20 segundos
const PERFECT_INPUT = {
  synonymsCorrect: 5,
  spellingCorrect: 5,
  hieroglyphsCorrect: 2,
  totalTimeInSeconds: 20,
};

describe('calcDailyScore', () => {
  describe('baseScore', () => {
    it('calcula 0 con todos los aciertos a 0', () => {
      const { baseScore } = calcDailyScore({
        synonymsCorrect: 0,
        spellingCorrect: 0,
        hieroglyphsCorrect: 0,
        totalTimeInSeconds: 0,
      });
      expect(baseScore).toBe(0);
    });

    it('suma correctamente sinónimos (×100) y ortografía (×100)', () => {
      const { baseScore } = calcDailyScore({
        synonymsCorrect: 3,
        spellingCorrect: 2,
        hieroglyphsCorrect: 0,
        totalTimeInSeconds: 999,
      });
      expect(baseScore).toBe(3 * 100 + 2 * 100); // 500
    });

    it('suma correctamente jeroglíficos (×150)', () => {
      const { baseScore } = calcDailyScore({
        synonymsCorrect: 0,
        spellingCorrect: 0,
        hieroglyphsCorrect: 2,
        totalTimeInSeconds: 999,
      });
      expect(baseScore).toBe(2 * 150); // 300
    });

    it('suma los tres tipos correctamente en una partida completa', () => {
      const { baseScore } = calcDailyScore(PERFECT_INPUT);
      expect(baseScore).toBe(5 * 100 + 5 * 100 + 2 * 150); // 1300
    });
  });

  describe('timeBonus', () => {
    it('devuelve el bonus máximo (200) con 0 segundos', () => {
      const { timeBonus } = calcDailyScore({
        synonymsCorrect: 0,
        spellingCorrect: 0,
        hieroglyphsCorrect: 0,
        totalTimeInSeconds: 0,
      });
      expect(timeBonus).toBe(200);
    });

    it('resta 4 puntos por segundo', () => {
      const { timeBonus } = calcDailyScore({
        synonymsCorrect: 0,
        spellingCorrect: 0,
        hieroglyphsCorrect: 0,
        totalTimeInSeconds: 20,
      });
      expect(timeBonus).toBe(200 - 20 * 4); // 120
    });

    it('nunca es negativo aunque la partida dure mucho', () => {
      const { timeBonus } = calcDailyScore({
        synonymsCorrect: 0,
        spellingCorrect: 0,
        hieroglyphsCorrect: 0,
        totalTimeInSeconds: 9999,
      });
      expect(timeBonus).toBe(0);
    });

    it('es exactamente 0 en el umbral (50 segundos)', () => {
      const { timeBonus } = calcDailyScore({
        synonymsCorrect: 0,
        spellingCorrect: 0,
        hieroglyphsCorrect: 0,
        totalTimeInSeconds: 50,
      });
      expect(timeBonus).toBe(0);
    });
  });

  describe('extraBonus', () => {
    it('no hay bonus extra sin bloques completos', () => {
      const { extraBonus } = calcDailyScore({
        synonymsCorrect: 4,
        spellingCorrect: 4,
        hieroglyphsCorrect: 1,
        totalTimeInSeconds: 0,
      });
      expect(extraBonus).toBe(0);
    });

    it('bonus de +50 por completar solo sinónimos', () => {
      const { extraBonus } = calcDailyScore({
        synonymsCorrect: 5,
        spellingCorrect: 0,
        hieroglyphsCorrect: 0,
        totalTimeInSeconds: 0,
      });
      expect(extraBonus).toBe(50);
    });

    it('bonus de +50 por completar solo ortografía', () => {
      const { extraBonus } = calcDailyScore({
        synonymsCorrect: 0,
        spellingCorrect: 5,
        hieroglyphsCorrect: 0,
        totalTimeInSeconds: 0,
      });
      expect(extraBonus).toBe(50);
    });

    it('bonus de +50 por completar solo jeroglíficos', () => {
      const { extraBonus } = calcDailyScore({
        synonymsCorrect: 0,
        spellingCorrect: 0,
        hieroglyphsCorrect: 2,
        totalTimeInSeconds: 0,
      });
      expect(extraBonus).toBe(50);
    });

    it('suma los tres bonus de bloque sin la partida perfecta', () => {
      // Los tres bloques completos pero no es partida perfecta (falta 1 en uno)
      // → esto no es posible: si los 3 bloques están completos, la partida es perfecta.
      // Verificamos que los tres bonus suman 150 + 100 en partida perfecta.
      const { extraBonus } = calcDailyScore(PERFECT_INPUT);
      expect(extraBonus).toBe(50 + 50 + 50 + 100); // 250
    });
  });

  describe('finalScore', () => {
    it('es la suma de los tres componentes', () => {
      const result = calcDailyScore(PERFECT_INPUT);
      expect(result.finalScore).toBe(result.baseScore + result.timeBonus + result.extraBonus);
    });

    it('puntuación máxima teórica: partida perfecta en 0 segundos', () => {
      const result = calcDailyScore({ ...PERFECT_INPUT, totalTimeInSeconds: 0 });
      // baseScore=1300, timeBonus=200, extraBonus=250
      expect(result.finalScore).toBe(1750);
    });

    it('puntuación mínima: ningún acierto, tiempo largo', () => {
      const result = calcDailyScore({
        synonymsCorrect: 0,
        spellingCorrect: 0,
        hieroglyphsCorrect: 0,
        totalTimeInSeconds: 9999,
      });
      expect(result.finalScore).toBe(0);
    });
  });

  describe('validación de entradas', () => {
    it('lanza error si synonymsCorrect supera el máximo', () => {
      expect(() =>
        calcDailyScore({ synonymsCorrect: 6, spellingCorrect: 0, hieroglyphsCorrect: 0, totalTimeInSeconds: 0 })
      ).toThrow('synonymsCorrect');
    });

    it('lanza error si spellingCorrect supera el máximo', () => {
      expect(() =>
        calcDailyScore({ synonymsCorrect: 0, spellingCorrect: 6, hieroglyphsCorrect: 0, totalTimeInSeconds: 0 })
      ).toThrow('spellingCorrect');
    });

    it('lanza error si hieroglyphsCorrect supera el máximo', () => {
      expect(() =>
        calcDailyScore({ synonymsCorrect: 0, spellingCorrect: 0, hieroglyphsCorrect: 3, totalTimeInSeconds: 0 })
      ).toThrow('hieroglyphsCorrect');
    });

    it('lanza error con valores negativos', () => {
      expect(() =>
        calcDailyScore({ synonymsCorrect: -1, spellingCorrect: 0, hieroglyphsCorrect: 0, totalTimeInSeconds: 0 })
      ).toThrow('synonymsCorrect');
    });

    it('lanza error si totalTimeInSeconds es negativo', () => {
      expect(() =>
        calcDailyScore({ synonymsCorrect: 0, spellingCorrect: 0, hieroglyphsCorrect: 0, totalTimeInSeconds: -1 })
      ).toThrow('totalTimeInSeconds');
    });

    it('lanza error si un acierto no es entero', () => {
      expect(() =>
        calcDailyScore({ synonymsCorrect: 1.5, spellingCorrect: 0, hieroglyphsCorrect: 0, totalTimeInSeconds: 0 })
      ).toThrow('synonymsCorrect');
    });
  });
});

describe('compareDailyScores', () => {
  const makePlayer = (finalScore: number, totalTimeInSeconds: number) => ({
    score: { baseScore: 0, timeBonus: 0, extraBonus: 0, finalScore },
    totalTimeInSeconds,
  });

  it('el jugador con mayor finalScore gana (devuelve negativo)', () => {
    const a = makePlayer(1200, 60);
    const b = makePlayer(900, 30);
    expect(compareDailyScores(a, b)).toBeLessThan(0);
  });

  it('en empate de puntuación, gana quien tardó menos', () => {
    const a = makePlayer(1000, 30);
    const b = makePlayer(1000, 60);
    expect(compareDailyScores(a, b)).toBeLessThan(0);
  });

  it('devuelve 0 si puntuación y tiempo son iguales', () => {
    const a = makePlayer(1000, 45);
    const b = makePlayer(1000, 45);
    expect(compareDailyScores(a, b)).toBe(0);
  });

  it('es compatible con Array.sort() — ordena de mayor a menor puntuación', () => {
    const players = [
      makePlayer(800, 40),
      makePlayer(1200, 60),
      makePlayer(1200, 30),
      makePlayer(500, 10),
    ];
    const sorted = [...players].sort(compareDailyScores);
    expect(sorted[0].score.finalScore).toBe(1200);
    expect(sorted[0].totalTimeInSeconds).toBe(30); // desempate por tiempo
    expect(sorted[1].totalTimeInSeconds).toBe(60);
    expect(sorted[3].score.finalScore).toBe(500);
  });
});
