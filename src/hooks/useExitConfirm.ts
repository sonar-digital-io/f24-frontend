import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

/** Shared "Exit without finishing?" flow for autosave-on-blur edit pages (Material,
 *  Geometry, ...) — everything already persists as it's typed, so exiting with mandatory
 *  fields still missing doesn't lose data, it just leaves the record incomplete. Warns
 *  once via `handleExit`, then either leaves anyway or stays and highlights what's missing. */
export function useExitConfirm(exitTarget: string, isIncomplete: boolean) {
  const navigate = useNavigate();
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showMissingFieldErrors, setShowMissingFieldErrors] = useState(false);

  function handleExit() {
    if (isIncomplete) {
      setShowExitConfirm(true);
      return;
    }
    navigate(exitTarget);
  }

  function handleExitAnyway() {
    setShowExitConfirm(false);
    navigate(exitTarget);
  }

  function handleStayAndReview() {
    setShowExitConfirm(false);
    setShowMissingFieldErrors(true);
  }

  return { showExitConfirm, showMissingFieldErrors, handleExit, handleExitAnyway, handleStayAndReview };
}
