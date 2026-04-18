export interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

export const createHistoryState = <T>(present: T): HistoryState<T> => ({
  past: [],
  present,
  future: [],
});

export const pushHistoryState = <T>(
  history: HistoryState<T>,
  nextPresent: T,
  limit = 100
): HistoryState<T> => {
  const nextPast = [...history.past, history.present];
  const trimmedPast =
    nextPast.length > limit ? nextPast.slice(nextPast.length - limit) : nextPast;

  return {
    past: trimmedPast,
    present: nextPresent,
    future: [],
  };
};

export const undoHistory = <T>(history: HistoryState<T>): HistoryState<T> => {
  if (history.past.length === 0) return history;

  const previous = history.past[history.past.length - 1];
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  };
};

export const redoHistory = <T>(history: HistoryState<T>): HistoryState<T> => {
  if (history.future.length === 0) return history;

  const next = history.future[0];
  return {
    past: [...history.past, history.present],
    present: next,
    future: history.future.slice(1),
  };
};
