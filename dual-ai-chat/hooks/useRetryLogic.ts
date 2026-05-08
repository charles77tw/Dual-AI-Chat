
import { useCallback } from 'react';
import { MessageSender, MessagePurpose, FailedStepPayload, DiscussionMode, ParsedAIResponse, ChatLogicCommonDependencies } from '../types';
import { buildFinalAnswerPrompt } from '../utils/promptBuilder';
import { useChatState } from './useChatState';
import { useStepExecutor } from './useStepExecutor';
import { useDiscussionLoop } from './useDiscussionLoop';

interface UseRetryLogicProps extends ChatLogicCommonDependencies {
  state: ReturnType<typeof useChatState>;
  executeStep: ReturnType<typeof useStepExecutor>['executeStep'];
  runDiscussionLoop: ReturnType<typeof useDiscussionLoop>['runDiscussionLoop'];
}

export const useRetryLogic = ({
  state,
  executeStep,
  runDiscussionLoop,
  addMessage,
  processNotepadUpdateFromAI,
  setGlobalApiKeyStatus,
  cognitoModelDetails,
  museModelDetails,
  discussionMode,
  manualFixedTurns,
  notepadContent,
  startProcessingTimer,
  stopProcessingTimer,
}: UseRetryLogicProps) => {
  const {
    isLoading, setIsLoading,
    setDiscussionLog,
    failedStepInfo, setFailedStepInfo,
    cancelRequestRef,
    setIsInternalDiscussionActive,
    setCurrentDiscussionTurn,
    isInternalDiscussionActive,
    setLastCompletedTurnCount
  } = state;

  const continueDiscussionAfterSuccessfulRetry = useCallback(async (
    retriedStepPayload: FailedStepPayload,
    retryResponse: ParsedAIResponse,
    notepadError?: string | null
  ) => {
    const {
      stepIdentifier: retriedStepId,
      userInputForFlow,
      imageApiPartForFlow,
    } = retriedStepPayload;

    let localDiscussionLog = [...retriedStepPayload.discussionLogBeforeFailure!];
    localDiscussionLog.push(`${retriedStepPayload.sender}: ${retryResponse.spokenText}`);
    
    if (notepadError) {
        localDiscussionLog.push(`(System Note: ${notepadError})`);
    }

    setDiscussionLog(localDiscussionLog);

    let localLastTurnTextForLog = retryResponse.spokenText;
    let localPreviousAISignaledStop = (discussionMode === DiscussionMode.AiDriven && (retryResponse.discussionShouldEnd || false));
    if (discussionMode === DiscussionMode.AiDriven && retriedStepPayload.previousAISignaledStopForResume && retryResponse.discussionShouldEnd) {
      localPreviousAISignaledStop = true;
    }

    const imageInstructionForAI = imageApiPartForFlow ? "用戶還提供了一張圖片。請在您的分析和回覆中同時考慮此圖片和文字查詢。" : "";

    let initialLoopTurn = 0;
    let skipMuseInFirstIteration = false;

    if (retriedStepId === 'cognito-initial-to-muse') {
      initialLoopTurn = 0;
      setIsInternalDiscussionActive(true);
      setCurrentDiscussionTurn(0);
      if (localPreviousAISignaledStop) addMessage(`${MessageSender.Cognito} 已建議結束討論。等待 ${MessageSender.Muse} 的回應。`, MessageSender.System, MessagePurpose.SystemNotification);
    } else if (retriedStepId.startsWith('muse-reply-to-cognito-turn-')) {
      initialLoopTurn = retriedStepPayload.currentTurnIndexForResume ?? 0;
      setIsInternalDiscussionActive(true);
      setCurrentDiscussionTurn(initialLoopTurn);
      skipMuseInFirstIteration = true;
      if (discussionMode === DiscussionMode.AiDriven && localPreviousAISignaledStop && retriedStepPayload.previousAISignaledStopForResume) {
        addMessage(`雙方AI (${MessageSender.Cognito} 和 ${MessageSender.Muse}) 已同意結束討論。`, MessageSender.System, MessagePurpose.SystemNotification);
        setIsInternalDiscussionActive(false);
      } else if (discussionMode === DiscussionMode.AiDriven && localPreviousAISignaledStop) {
        addMessage(`${MessageSender.Muse} 已建議結束討論。等待 ${MessageSender.Cognito} 的回應。`, MessageSender.System, MessagePurpose.SystemNotification);
      }
    } else if (retriedStepId.startsWith('cognito-reply-to-muse-turn-')) {
      initialLoopTurn = (retriedStepPayload.currentTurnIndexForResume ?? 0) + 1;
      setIsInternalDiscussionActive(true);
      setCurrentDiscussionTurn(initialLoopTurn);
      if (discussionMode === DiscussionMode.AiDriven && localPreviousAISignaledStop && retriedStepPayload.previousAISignaledStopForResume) {
        addMessage(`雙方AI (${MessageSender.Muse} 和 ${MessageSender.Cognito}) 已同意結束討論。`, MessageSender.System, MessagePurpose.SystemNotification);
        setIsInternalDiscussionActive(false);
      } else if (discussionMode === DiscussionMode.AiDriven && localPreviousAISignaledStop) {
        addMessage(`${MessageSender.Cognito} 已建議結束討論。等待 ${MessageSender.Muse} 的回應。`, MessageSender.System, MessagePurpose.SystemNotification);
      }
    } else if (retriedStepId === 'cognito-final-answer') {
      setIsInternalDiscussionActive(false);
      return;
    }

    try {
      let discussionLoopShouldRun = true;

      // Logic to determine if we should even run the loop based on stop signals from the retry
      if (discussionMode === DiscussionMode.AiDriven && localPreviousAISignaledStop && retriedStepPayload.previousAISignaledStopForResume) {
        discussionLoopShouldRun = false;
      }
      if (retriedStepId === 'cognito-final-answer') discussionLoopShouldRun = false;

      let finalTurnForStats = initialLoopTurn;
      let resultingLog = localDiscussionLog;

      if (discussionLoopShouldRun && isInternalDiscussionActive) {
         const loopResult = await runDiscussionLoop({
            startTurn: initialLoopTurn,
            initialLog: localDiscussionLog,
            initialLastTurnText: localLastTurnTextForLog,
            initialPreviousAISignaledStop: localPreviousAISignaledStop,
            skipMuseInFirstTurn: skipMuseInFirstIteration,
            userInput: userInputForFlow,
            imageInstruction: imageInstructionForAI,
            imageApiPart: imageApiPartForFlow
         });
         finalTurnForStats = loopResult.finalTurnForStats;
         resultingLog = loopResult.localDiscussionLog;
      }
      
      setIsInternalDiscussionActive(false);
      if (cancelRequestRef.current) return;

      const finalAnswerStepIdentifier = 'cognito-final-answer';
      addMessage(`${MessageSender.Cognito} 正在綜合討論內容，準備最終答案 (使用 ${cognitoModelDetails.name})...`, MessageSender.System, MessagePurpose.SystemNotification);

      const finalAnswerPromptText = buildFinalAnswerPrompt(
        userInputForFlow,
        imageInstructionForAI,
        resultingLog,
        notepadContent,
        discussionMode
      );

      const finalAnswerParsedResponse = await executeStep(
        finalAnswerStepIdentifier, finalAnswerPromptText, cognitoModelDetails, MessageSender.Cognito, MessagePurpose.FinalResponse, imageApiPartForFlow,
        userInputForFlow, imageApiPartForFlow, [...resultingLog]
      );
      if (cancelRequestRef.current) return;
      processNotepadUpdateFromAI(finalAnswerParsedResponse, MessageSender.Cognito, addMessage);

      // Successfully completed the flow
      if (discussionMode === DiscussionMode.FixedTurns) {
        setLastCompletedTurnCount(manualFixedTurns);
      } else {
        setLastCompletedTurnCount(finalTurnForStats + 1);
      }

    } catch (error) {
      const e = error as Error;
      if (cancelRequestRef.current || e.message === '使用者取消操作') { /* User cancelled */ }
      else if (!e.message.includes("API金鑰") && !e.message.toLowerCase().includes("api key") && !(e as any).isHandled) {
        console.error("繼續討論流程中發生錯誤:", error);
      }
      setIsInternalDiscussionActive(false);
    } finally {
      if (!failedStepInfo || cancelRequestRef.current) {
        setIsLoading(false);
        stopProcessingTimer();
      }
      if (cancelRequestRef.current && !failedStepInfo) {
        addMessage("用戶已停止AI回應。", MessageSender.System, MessagePurpose.SystemNotification);
      }
      setIsInternalDiscussionActive(false);
    }
  }, [
    addMessage, executeStep, processNotepadUpdateFromAI, setDiscussionLog, runDiscussionLoop,
    discussionMode, manualFixedTurns, cognitoModelDetails, notepadContent,
    setIsLoading, stopProcessingTimer, failedStepInfo, setIsInternalDiscussionActive, setLastCompletedTurnCount,
    setCurrentDiscussionTurn, isInternalDiscussionActive, cancelRequestRef
  ]);

  const retryFailedStep = useCallback(async (stepToRetry: FailedStepPayload) => {
    if (isLoading) return;

    setIsLoading(true);
    cancelRequestRef.current = false;
    // Abort previous if any
    if (state.abortControllerRef.current) {
        state.abortControllerRef.current.abort();
    }
    state.abortControllerRef.current = new AbortController();
    
    setGlobalApiKeyStatus({});
    startProcessingTimer();

    setFailedStepInfo(null);
    addMessage(
      `[${stepToRetry.sender} - ${stepToRetry.stepIdentifier}] 正在手动重试...`,
      MessageSender.System,
      MessagePurpose.SystemNotification
    );

    const modelForRetry = stepToRetry.sender === MessageSender.Cognito ? cognitoModelDetails : museModelDetails;

    const updatedStepToRetry = {
      ...stepToRetry,
      modelName: modelForRetry.apiName,
    };

    try {
      const parsedResponseFromRetry = await executeStep(
        updatedStepToRetry.stepIdentifier,
        updatedStepToRetry.prompt,
        modelForRetry,
        updatedStepToRetry.sender,
        updatedStepToRetry.purpose,
        updatedStepToRetry.imageApiPart,
        updatedStepToRetry.userInputForFlow,
        updatedStepToRetry.imageApiPartForFlow,
        updatedStepToRetry.discussionLogBeforeFailure,
        updatedStepToRetry.currentTurnIndexForResume,
        updatedStepToRetry.previousAISignaledStopForResume
      );

      if (cancelRequestRef.current) throw new Error("用戶已停止手動重試");
      
      const notepadError = processNotepadUpdateFromAI(parsedResponseFromRetry, updatedStepToRetry.sender, addMessage);
      
      addMessage(`[${updatedStepToRetry.sender} - ${updatedStepToRetry.stepIdentifier}] 手動重試成功。後續流程將持續。`, MessageSender.System, MessagePurpose.SystemNotification);

      await continueDiscussionAfterSuccessfulRetry(
        { ...updatedStepToRetry, imageApiPartForFlow: updatedStepToRetry.imageApiPartForFlow },
        parsedResponseFromRetry,
        notepadError
      );

    } catch (error) {
      if (cancelRequestRef.current) { /* User cancelled */ }
      else {
        console.error("手動重試失敗 (已由 executeStep 處理):", error);
      }
      
      if (!cancelRequestRef.current || failedStepInfo) {
        setIsLoading(false);
        stopProcessingTimer();
      }
      setIsInternalDiscussionActive(false);
      if (cancelRequestRef.current && !failedStepInfo) {
        addMessage("用戶已停止手動重試。", MessageSender.System, MessagePurpose.SystemNotification);
      }
    }
  }, [
    isLoading, setIsLoading, setGlobalApiKeyStatus, startProcessingTimer, stopProcessingTimer,
    setFailedStepInfo, addMessage, cognitoModelDetails, museModelDetails, executeStep, 
    processNotepadUpdateFromAI, continueDiscussionAfterSuccessfulRetry, failedStepInfo, 
    setIsInternalDiscussionActive, cancelRequestRef
  ]);

  return { retryFailedStep };
};
