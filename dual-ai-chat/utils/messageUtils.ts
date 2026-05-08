
import { MessageSender, DiscussionMode } from '../types';

export const getWelcomeMessageText = (
  cognitoModelNameFromDetails: string, 
  museModelNameFromDetails: string,    
  currentDiscussionMode: DiscussionMode,
  currentManualFixedTurns: number,
  isOpenAiActive: boolean,
  openAiCognitoModelId?: string, 
  openAiMuseModelId?: string     
): string => {
  let modeInfo = currentDiscussionMode === DiscussionMode.FixedTurns
    ? `固定輪次 (${currentManualFixedTurns}輪)`
    : "AI 驅動 (自動)";

  let cognitoName = isOpenAiActive ? (openAiCognitoModelId || '未指定') : cognitoModelNameFromDetails;
  let museName = isOpenAiActive ? (openAiMuseModelId || '未指定') : museModelNameFromDetails;

  // Structured format for MessageBubble to parse: Title\nMode: Value\nCognito: Value\nMuse: Value
  return `Dual AI Chat 已就緒\n模式：${modeInfo}\nCognito：${cognitoName}\nMuse：${museName}`;
};
