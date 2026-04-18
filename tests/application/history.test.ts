import { describe, expect, it } from 'vitest';
import {
  createHistoryState,
  pushHistoryState,
  redoHistory,
  undoHistory,
} from '../../application/history';

describe('application/history', () => {
  it('pushes, undoes, and redoes state transitions', () => {
    let history = createHistoryState('a');
    history = pushHistoryState(history, 'b');
    history = pushHistoryState(history, 'c');

    expect(history.present).toBe('c');
    expect(history.past).toEqual(['a', 'b']);

    history = undoHistory(history);
    expect(history.present).toBe('b');

    history = redoHistory(history);
    expect(history.present).toBe('c');
  });

  it('drops future history when a new state is pushed', () => {
    let history = createHistoryState(1);
    history = pushHistoryState(history, 2);
    history = pushHistoryState(history, 3);
    history = undoHistory(history);
    history = pushHistoryState(history, 4);

    expect(history.present).toBe(4);
    expect(history.future).toEqual([]);
  });
});
