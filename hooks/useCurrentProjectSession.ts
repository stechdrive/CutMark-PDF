import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createCutsFromProjectDocument } from '../application/projectProjection';
import { HistoryState, createHistoryState, pushHistoryState, redoHistory, undoHistory } from '../application/history';
import { createSequentialProjectAssetBindings } from '../application/projectBindings';
import {
  createCurrentProjectDocument,
  CurrentProjectSessionPresent,
  materializeCurrentProjectPresent,
  syncCurrentProjectHistoryWithInputs,
  updateCurrentProjectLogicalPages,
  withSelectedCut,
} from '../application/currentProjectSessionState';
import {
  isSameNumberingState,
  renumberLogicalPagesFromCut,
} from '../domain/numbering';
import { AssetHint, NumberingPolicy } from '../domain/project';
import { LogicalCutEditorApi } from './logicalCutEditorApi';
import { ProjectWorkspaceSession } from './projectWorkspaceSession';
import { AppSettings, Cut, DocType, NumberingState, Template } from '../types';

const HISTORY_LIMIT = 100;

interface UseCurrentProjectSessionOptions {
  docType: DocType | null;
  currentPage: number;
  numPages: number;
  currentAssetHints: Array<AssetHint | null | undefined>;
  currentProjectName?: string;
  settings: AppSettings;
  numberingState: NumberingState;
  setNumberingState: (next: NumberingState) => void;
  template: Template;
}

export const useCurrentProjectSession = ({
  docType,
  currentPage,
  numPages,
  currentAssetHints,
  currentProjectName,
  settings,
  numberingState,
  setNumberingState,
  template,
}: UseCurrentProjectSessionOptions) => {
  const rawHistoryRef = useRef<HistoryState<CurrentProjectSessionPresent> | null>(null);
  const dragBaseRef = useRef<CurrentProjectSessionPresent | null>(null);

  const [rawHistory, setRawHistory] = useState<HistoryState<CurrentProjectSessionPresent>>(() =>
    createHistoryState(
      withSelectedCut(
        createCurrentProjectDocument({
          docType,
          numPages,
          currentAssetHints,
          currentProjectName,
          settings,
          template,
        }),
        null
      )
    )
  );

  useEffect(() => {
    rawHistoryRef.current = rawHistory;
  }, [rawHistory]);

  const materializePresent = useCallback((
    present: CurrentProjectSessionPresent
  ): CurrentProjectSessionPresent => {
    return materializeCurrentProjectPresent(present, {
      docType,
      numPages,
      currentAssetHints,
      currentProjectName,
      settings,
      template,
    });
  }, [
    currentAssetHints,
    currentProjectName,
    docType,
    numPages,
    settings,
    template,
  ]);

  const requestNumberingSync = useCallback((next: NumberingState) => {
    setNumberingState(next);
  }, [setNumberingState]);

  const history = useMemo(
    () =>
      syncCurrentProjectHistoryWithInputs(
        rawHistory,
        {
          docType,
          numPages,
          currentAssetHints,
          currentProjectName,
          settings,
          template,
        },
        numberingState
      ),
    [
      rawHistory,
      currentAssetHints,
      currentProjectName,
      docType,
      numPages,
      numberingState,
      settings,
      template,
    ]
  );

  const replacePresent = useCallback((
    updater: (current: CurrentProjectSessionPresent) => CurrentProjectSessionPresent
  ) => {
    const current = rawHistoryRef.current?.present ?? rawHistory.present;
    const baseCurrent = materializePresent(current);
    const next = updater(baseCurrent);
    if (next === baseCurrent) return;

    setRawHistory((prev) => ({
      ...prev,
      present: next,
    }));

    const currentNumbering = baseCurrent.project?.numbering ?? numberingState;
    const nextNumbering = next.project?.numbering ?? currentNumbering;
    if (!isSameNumberingState(currentNumbering, nextNumbering)) {
      requestNumberingSync(nextNumbering);
    }
  }, [materializePresent, numberingState, rawHistory.present, requestNumberingSync]);

  const pushPresent = useCallback((
    updater: (current: CurrentProjectSessionPresent) => CurrentProjectSessionPresent
  ) => {
    const current = rawHistoryRef.current?.present ?? rawHistory.present;
    const baseCurrent = materializePresent(current);
    const next = updater(baseCurrent);
    if (next === baseCurrent) return;

    setRawHistory((prev) =>
      pushHistoryState(
        {
          ...prev,
          present: materializePresent(prev.present),
        },
        next,
        HISTORY_LIMIT
      )
    );

    const currentNumbering = baseCurrent.project?.numbering ?? numberingState;
    const nextNumbering = next.project?.numbering ?? currentNumbering;
    if (!isSameNumberingState(currentNumbering, nextNumbering)) {
      requestNumberingSync(nextNumbering);
    }
  }, [materializePresent, numberingState, rawHistory.present, requestNumberingSync]);

  const resetProject = useCallback(() => {
    setRawHistory(createHistoryState({ project: null, selectedCutId: null }));
    dragBaseRef.current = null;
  }, []);

  const addCut = useCallback((newCut: Cut, nextNumbering?: NumberingState) => {
    pushPresent((current) => {
      const baseProject =
        current.project ??
        createCurrentProjectDocument({
          docType,
          numPages,
          currentAssetHints,
          currentProjectName,
          settings,
          template,
        });

      if (!baseProject) return current;

      const nextProject = updateCurrentProjectLogicalPages(baseProject, (logicalPages) =>
        logicalPages.map((page, index) =>
          index === newCut.pageIndex
            ? {
                ...page,
                cuts: [
                  ...page.cuts,
                  {
                    id: newCut.id,
                    x: newCut.x,
                    y: newCut.y,
                    label: newCut.label,
                    isBranch: newCut.isBranch,
                  },
                ],
              }
            : page
        )
      );

      return withSelectedCut(
        {
          ...nextProject,
          numbering: nextNumbering
            ? {
                ...nextProject.numbering,
                nextNumber: nextNumbering.nextNumber,
                branchChar: nextNumbering.branchChar,
              }
            : nextProject.numbering,
        },
        current.selectedCutId
      );
    });
  }, [
    currentAssetHints,
    currentProjectName,
    docType,
    numPages,
    pushPresent,
    settings,
    template,
  ]);

  const updateCutPosition = useCallback((id: string, x: number, y: number) => {
    const current = rawHistoryRef.current?.present ?? rawHistory.present;
    if (!current.project) return;

    if (!dragBaseRef.current) {
      dragBaseRef.current = current;
    }

    replacePresent((present) => {
      if (!present.project) return present;
      return withSelectedCut(
        updateCurrentProjectLogicalPages(present.project, (logicalPages) =>
          logicalPages.map((page) => ({
            ...page,
            cuts: page.cuts.map((cut) =>
              cut.id === id ? { ...cut, x, y } : cut
            ),
          }))
        ),
        present.selectedCutId
      );
    });
  }, [rawHistory.present, replacePresent]);

  const handleCutDragEnd = useCallback(() => {
    const dragBase = dragBaseRef.current;
    dragBaseRef.current = null;
    if (!dragBase) return;

    const current = rawHistoryRef.current?.present ?? rawHistory.present;
    if (current === dragBase) return;

    setRawHistory((prev) =>
      pushHistoryState(
        {
          past: prev.past,
          present: dragBase,
          future: prev.future,
        },
        current,
        HISTORY_LIMIT
      )
    );
  }, [rawHistory.present]);

  const deleteCut = useCallback((id: string) => {
    pushPresent((current) => {
      if (!current.project) return current;
      return withSelectedCut(
        updateCurrentProjectLogicalPages(current.project, (logicalPages) =>
          logicalPages.map((page) => ({
            ...page,
            cuts: page.cuts.filter((cut) => cut.id !== id),
          }))
        ),
        current.selectedCutId === id ? null : current.selectedCutId
      );
    });
  }, [pushPresent]);

  const setProjectNumberingState = useCallback((nextNumbering: NumberingState) => {
    const currentProject = rawHistoryRef.current?.present.project ?? rawHistory.present.project;
    const currentNumbering = currentProject?.numbering ?? numberingState;
    if (isSameNumberingState(currentNumbering, nextNumbering)) {
      return;
    }

    pushPresent((current) => {
      if (!current.project) return current;
      return withSelectedCut(
        {
          ...current.project,
          numbering: {
            ...current.project.numbering,
            nextNumber: nextNumbering.nextNumber,
            branchChar: nextNumbering.branchChar,
          },
        },
        current.selectedCutId
      );
    });
  }, [numberingState, pushPresent, rawHistory.present.project]);

  const renumberFromCut = useCallback((
    startCutId: string,
    startNumbering: NumberingState,
    minDigits: number,
    autoIncrement: boolean
  ) => {
    pushPresent((current) => {
      if (!current.project) return current;

      const numbering: NumberingPolicy = {
        nextNumber: startNumbering.nextNumber,
        branchChar: startNumbering.branchChar,
        minDigits,
        autoIncrement,
      };
      const result = renumberLogicalPagesFromCut(
        current.project.logicalPages,
        startCutId,
        numbering
      );
      if (!result.found) return current;

      return withSelectedCut(
        {
          ...current.project,
          logicalPages: result.logicalPages,
          numbering: {
            ...current.project.numbering,
            nextNumber: result.nextNumbering.nextNumber,
            branchChar: result.nextNumbering.branchChar,
          },
        },
        current.selectedCutId
      );
    });
  }, [pushPresent]);

  const undo = useCallback(() => {
    const current = rawHistoryRef.current ?? rawHistory;
    const next = undoHistory<CurrentProjectSessionPresent>(current);
    if (next === current) return;

    setRawHistory(next);
    dragBaseRef.current = null;

    const currentNumbering = current.present.project?.numbering ?? numberingState;
    const nextNumbering = next.present.project?.numbering ?? currentNumbering;
    if (!isSameNumberingState(currentNumbering, nextNumbering)) {
      requestNumberingSync(nextNumbering);
    }
  }, [numberingState, rawHistory, requestNumberingSync]);

  const redo = useCallback(() => {
    const current = rawHistoryRef.current ?? rawHistory;
    const next = redoHistory<CurrentProjectSessionPresent>(current);
    if (next === current) return;

    setRawHistory(next);
    dragBaseRef.current = null;

    const currentNumbering = current.present.project?.numbering ?? numberingState;
    const nextNumbering = next.present.project?.numbering ?? currentNumbering;
    if (!isSameNumberingState(currentNumbering, nextNumbering)) {
      requestNumberingSync(nextNumbering);
    }
  }, [numberingState, rawHistory, requestNumberingSync]);

  const project = history.present.project;
  const cuts = useMemo(
    () => (project ? createCutsFromProjectDocument(project) : []),
    [project]
  );
  const bindings = useMemo(
    () =>
      project
        ? createSequentialProjectAssetBindings(project, currentAssetHints.length)
        : {},
    [currentAssetHints.length, project]
  );
  const previewLogicalPage = project?.logicalPages[currentPage - 1] ?? null;
  const selectedLogicalPageId = previewLogicalPage?.id ?? null;
  const selectedLogicalPageNumber = previewLogicalPage ? currentPage : null;
  const selectedAssetIndex = previewLogicalPage ? currentPage - 1 : null;
  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const workspaceSession: ProjectWorkspaceSession = {
    project,
    bindings,
    selectedLogicalPage: previewLogicalPage,
    selectedLogicalPageId,
    selectedLogicalPageNumber,
    selectedAssetIndex,
  };

  const projectCutEditorApi: LogicalCutEditorApi = {
    project,
    settings: {
      ...settings,
      nextNumber: project?.numbering.nextNumber ?? settings.nextNumber,
      branchChar: project?.numbering.branchChar ?? settings.branchChar,
    },
    selectedLogicalPageId,
    selectedCutId: history.present.selectedCutId,
    canUndo,
    canRedo,
    historyIndex: history.past.length - 1,
    historyLength: history.past.length + history.future.length,
    addCutToSelectedPage: (cut, nextNumbering) => {
      if (!selectedLogicalPageId) return;
      addCut(
        {
          id: cut.id,
          pageIndex: Math.max(currentPage - 1, 0),
          x: cut.x,
          y: cut.y,
          label: cut.label,
          isBranch: cut.isBranch,
        },
        nextNumbering
      );
    },
    selectCut: (cutId) => {
      setRawHistory((prev) => ({
        ...prev,
        present: {
          ...prev.present,
          selectedCutId: cutId,
        },
      }));
    },
    updateCutPosition,
    commitCutDrag: handleCutDragEnd,
    deleteCut,
    setNumberingState: setProjectNumberingState,
    renumberFromCut: (cutId, numbering) => {
      renumberFromCut(
        cutId,
        {
          nextNumber: numbering.nextNumber,
          branchChar: numbering.branchChar,
        },
        numbering.minDigits,
        numbering.autoIncrement
      );
    },
    undo,
    redo,
  };

  return {
    cuts,
    selectedCutId: history.present.selectedCutId,
    historyIndex: history.past.length - 1,
    historyLength: history.past.length + history.future.length,
    setSelectedCutId: projectCutEditorApi.selectCut,
    addCut,
    updateCutPosition,
    handleCutDragEnd,
    deleteCut,
    setProjectNumberingState,
    renumberFromCut,
    undo,
    redo,
    resetProject,
    project,
    bindings,
    previewLogicalPage,
    selectedLogicalPage: previewLogicalPage,
    selectedLogicalPageId,
    selectedLogicalPageNumber,
    selectedAssetIndex,
    workspaceSession,
    projectCutEditorApi,
  };
};
