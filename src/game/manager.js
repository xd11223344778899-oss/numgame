import { config } from '../config.js';

/**
 * @typedef {Object} TimeoutHandlers
 * @property {(payload: { channelId: string, target: number }) => void | Promise<void>} onExpired
 */

/**
 * @typedef {Object} GameState
 * @property {string} channelId
 * @property {string} startedByUserId
 * @property {number} target
 * @property {number} attemptsLeft
 * @property {NodeJS.Timeout | null} timer
 * @property {TimeoutHandlers} handlers
 */

/** @typedef {'higher' | 'lower' | 'win' | 'lose'} GuessResult */

export class GameManager {
  /** @type {GameState | null} */
  #game = null;

  /**
   * @param {string} channelId
   * @param {string} startedByUserId
   * @param {TimeoutHandlers} handlers
   * @returns {{ game: GameState } | { error: 'already_active' }}
   */
  start(channelId, startedByUserId, handlers) {
    if (this.#game) {
      return { error: 'already_active' };
    }

    const game = {
      channelId,
      startedByUserId,
      target: this.#randomTarget(),
      attemptsLeft: config.maxAttempts,
      timer: null,
      handlers,
    };

    this.#game = game;
    this.#startTimer(game);
    return { game };
  }

  /**
   * @returns {GameState | null}
   */
  get() {
    return this.#game;
  }

  /**
   * @param {string} channelId
   * @returns {GameState | null}
   */
  getInChannel(channelId) {
    if (this.#game?.channelId === channelId) {
      return this.#game;
    }
    return null;
  }

  end() {
    if (!this.#game) {
      return;
    }

    this.#clearTimer(this.#game);
    this.#game = null;
  }

  resetTimer() {
    if (this.#game) {
      this.#startTimer(this.#game);
    }
  }

  /**
   * @param {number} guess
   * @returns {{ result: GuessResult, game: GameState, target?: number } | null}
   */
  processGuess(guess) {
    const game = this.#game;
    if (!game) {
      return null;
    }

    game.attemptsLeft -= 1;

    if (guess === game.target) {
      const target = game.target;
      this.end();
      return { result: 'win', game, target };
    }

    if (game.attemptsLeft <= 0) {
      const target = game.target;
      this.end();
      return { result: 'lose', game, target };
    }

    const result = guess > game.target ? 'higher' : 'lower';
    return { result, game };
  }

  get activeCount() {
    return this.#game ? 1 : 0;
  }

  #handleTimeout() {
    const game = this.#game;
    if (!game) {
      return;
    }

    const target = game.target;
    const handlers = game.handlers;
    this.end();
    void handlers.onExpired({ channelId: game.channelId, target });
  }

  /**
   * @param {GameState} game
   */
  #startTimer(game) {
    this.#clearTimer(game);
    game.timer = setTimeout(() => this.#handleTimeout(), config.answerTimeoutMs);
  }

  /**
   * @param {GameState} game
   */
  #clearTimer(game) {
    if (game.timer) {
      clearTimeout(game.timer);
      game.timer = null;
    }
  }

  #randomTarget() {
    return Math.floor(Math.random() * config.maxNumber) + config.minNumber;
  }
}

export const gameManager = new GameManager();
