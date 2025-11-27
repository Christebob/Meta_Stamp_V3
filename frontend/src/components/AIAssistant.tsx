/**
 * AIAssistant Component
 *
 * AI assistant chat interface component for META-STAMP V3 providing conversational
 * guidance to creators about their assets, fingerprints, AI Touch Scores, and earnings.
 *
 * Features:
 * - Message history display using ChatMessage components
 * - Real-time streaming response handling with incremental updates
 * - Multi-provider indicator showing active LLM (OpenAI/Anthropic/Google/Local)
 * - Tool call visualization when assistant queries system data
 * - Conversation persistence in localStorage
 * - Typing indicator during response generation
 * - Collapsible/expandable panel for space management
 * - Welcome message with suggested prompts for new users
 * - TailwindCSS card layout with scrollable message area
 * - Comprehensive accessibility support
 *
 * @module components/AIAssistant
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  Send,
  ChevronDown,
  ChevronUp,
  Bot,
  Trash2,
  Wrench,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useAIAssistant, Message, ToolCall } from '@/hooks/useAIAssistant';
import ChatMessage from '@/components/ChatMessage';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Supported AI provider types
 */
export type AIProvider = 'openai' | 'anthropic' | 'google' | 'local';

/**
 * Props interface for the AIAssistant component
 */
export interface AIAssistantProps {
  /** Initial AI provider to display (default: 'openai') */
  initialProvider?: AIProvider;
  /** Whether the panel can be collapsed (default: true) */
  collapsible?: boolean;
  /** Initial expanded state (default: false) */
  defaultExpanded?: boolean;
  /** Optional CSS class name for the container */
  className?: string;
}

/**
 * Suggested prompt for the welcome message
 */
interface SuggestedPrompt {
  /** Display text for the prompt button */
  label: string;
  /** Full message to send when clicked */
  message: string;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * localStorage key for persisting expanded state
 */
const EXPANDED_STATE_KEY = 'metastamp_assistant_expanded';

/**
 * Suggested prompts shown in the welcome message
 */
const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  {
    label: 'Explain AI Touch Score',
    message: 'Can you explain what an AI Touch Score is and how it affects my earnings?',
  },
  {
    label: 'Show my top earning assets',
    message: 'What are my top earning assets based on AI Touch Value calculations?',
  },
  {
    label: 'What is fingerprinting?',
    message: 'How does the fingerprinting process work for my creative assets?',
  },
  {
    label: 'How does compensation work?',
    message: 'How is my compensation calculated when AI companies use my work?',
  },
];

/**
 * Provider configuration for displaying badges
 */
const PROVIDER_CONFIG: Record<
  AIProvider,
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  openai: {
    label: 'OpenAI GPT',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-300',
  },
  anthropic: {
    label: 'Claude',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-300',
  },
  google: {
    label: 'Gemini',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300',
  },
  local: {
    label: 'Local Model',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
  },
};

// ============================================================================
// Helper Components
// ============================================================================

/**
 * Provider badge component showing the active LLM
 */
const ProviderBadge: React.FC<{ provider: AIProvider }> = ({ provider }) => {
  const config = PROVIDER_CONFIG[provider];

  return (
    <div
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
        border ${config.bgColor} ${config.color} ${config.borderColor}
      `}
      title={`Powered by ${config.label}`}
    >
      <Bot className="w-3 h-3" aria-hidden="true" />
      <span>{config.label}</span>
    </div>
  );
};

/**
 * Typing indicator shown while waiting for assistant response
 */
const TypingIndicator: React.FC = () => {
  return (
    <div
      className="flex items-start gap-3 mb-4"
      aria-label="Assistant is typing"
      role="status"
    >
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200">
        <Bot className="w-4 h-4 text-gray-600" aria-hidden="true" />
      </div>
      <div className="bg-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1">
          <span
            className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
            style={{ animationDelay: '0ms' }}
          />
          <span
            className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
            style={{ animationDelay: '150ms' }}
          />
          <span
            className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
            style={{ animationDelay: '300ms' }}
          />
        </div>
      </div>
    </div>
  );
};

/**
 * Tool call visualization component
 */
const ToolCallIndicator: React.FC<{ toolCalls: ToolCall[] }> = ({ toolCalls }) => {
  if (!toolCalls || toolCalls.length === 0) {
    return null;
  }

  /**
   * Get human-readable description for a tool call
   */
  const getToolDescription = (toolName: string): string => {
    const descriptions: Record<string, string> = {
      get_fingerprint: 'Querying fingerprint data...',
      query_analytics: 'Checking analytics...',
      get_wallet_balance: 'Checking wallet balance...',
      get_asset_details: 'Fetching asset details...',
      calculate_ai_touch_value: 'Calculating AI Touch Value...',
    };
    return descriptions[toolName] || `Running ${toolName}...`;
  };

  return (
    <div className="flex items-center gap-2 mb-2 text-sm text-gray-600">
      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100">
        <Wrench className="w-3 h-3 text-purple-600 animate-pulse" aria-hidden="true" />
      </div>
      <span className="italic">
        {toolCalls.map((tc) => getToolDescription(tc.name)).join(', ')}
      </span>
    </div>
  );
};

/**
 * Welcome message component with suggested prompts
 */
const WelcomeMessage: React.FC<{
  onPromptClick: (message: string) => void;
  disabled?: boolean;
}> = ({ onPromptClick, disabled }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full py-8 px-4 text-center">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 mb-4">
        <Sparkles className="w-8 h-8 text-white" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Hi! I&apos;m your META-STAMP assistant
      </h3>
      <p className="text-gray-600 mb-6 max-w-sm">
        I can help you understand your asset fingerprints, AI Touch Scores, and earnings.
        Ask me anything!
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {SUGGESTED_PROMPTS.map((prompt, index) => (
          <button
            key={index}
            type="button"
            onClick={() => onPromptClick(prompt.message)}
            disabled={disabled}
            className={`
              px-3 py-2 text-sm rounded-full border border-gray-300
              bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              transition-colors duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            aria-label={`Ask: ${prompt.label}`}
          >
            {prompt.label}
          </button>
        ))}
      </div>
    </div>
  );
};

/**
 * Error display component with retry button
 */
const ErrorDisplay: React.FC<{
  error: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}> = ({ error, onRetry, onDismiss }) => {
  return (
    <div
      className="flex items-start gap-3 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg"
      role="alert"
      aria-live="assertive"
    >
      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-red-700">{error}</p>
        <div className="flex gap-2 mt-2">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-800 font-medium"
            >
              <RefreshCw className="w-3 h-3" aria-hidden="true" />
              Retry
            </button>
          )}
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

/**
 * AIAssistant Component
 *
 * A comprehensive chat interface for interacting with the META-STAMP AI assistant.
 * Provides real-time streaming responses, tool call visualization, and conversation
 * persistence across sessions.
 *
 * @param props - Component configuration options
 * @returns The rendered AIAssistant component
 *
 * @example
 * ```tsx
 * // Basic usage
 * <AIAssistant />
 *
 * // With custom configuration
 * <AIAssistant
 *   initialProvider="anthropic"
 *   collapsible={true}
 *   defaultExpanded={true}
 * />
 * ```
 */
const AIAssistant: React.FC<AIAssistantProps> = ({
  initialProvider = 'openai',
  collapsible = true,
  defaultExpanded = false,
  className = '',
}) => {
  // =========================================================================
  // State and Hooks
  // =========================================================================

  // Use the AI assistant hook for conversation management
  const {
    messages,
    isLoading,
    isStreaming,
    error,
    conversationId,
    sendMessage,
    clearConversation,
  } = useAIAssistant();

  // Local state for UI management
  const [inputText, setInputText] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    // Load expanded state from localStorage on initial render
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(EXPANDED_STATE_KEY);
      if (stored !== null) {
        return stored === 'true';
      }
    }
    return defaultExpanded;
  });
  const [activeProvider] = useState<AIProvider>(initialProvider);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Refs for DOM elements
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // =========================================================================
  // Effects
  // =========================================================================

  /**
   * Auto-scroll to bottom when new messages arrive
   * Only scrolls if user is near the bottom (within 100px)
   */
  useEffect(() => {
    const container = messagesContainerRef.current;
    const endRef = messagesEndRef.current;

    if (!container || !endRef) {
      return;
    }

    // Check if user is near the bottom
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 100;

    if (isNearBottom || isStreaming) {
      endRef.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isStreaming]);

  /**
   * Persist expanded state to localStorage
   */
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(EXPANDED_STATE_KEY, String(isExpanded));
    }
  }, [isExpanded]);

  /**
   * Focus input when panel expands
   */
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  // =========================================================================
  // Event Handlers
  // =========================================================================

  /**
   * Handle sending a message to the assistant
   */
  const handleSendMessage = useCallback(
    async (messageText?: string) => {
      const textToSend = messageText || inputText.trim();

      if (!textToSend || isLoading || isStreaming) {
        return;
      }

      // Clear input immediately for better UX
      setInputText('');
      setLocalError(null);

      try {
        await sendMessage(textToSend);
      } catch (err) {
        // Error is handled by the hook, but we can show additional feedback
        setLocalError('Failed to send message. Please try again.');
        // Restore input text so user doesn't lose their message
        setInputText(textToSend);
      }
    },
    [inputText, isLoading, isStreaming, sendMessage]
  );

  /**
   * Handle keyboard events in the input area
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Send on Enter (without Shift)
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  /**
   * Handle input text changes with auto-resize
   */
  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInputText(event.target.value);

      // Auto-resize textarea (max 4 lines)
      const textarea = event.target;
      textarea.style.height = 'auto';
      const maxHeight = parseInt(getComputedStyle(textarea).lineHeight) * 4;
      textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    },
    []
  );

  /**
   * Handle clicking a suggested prompt
   */
  const handlePromptClick = useCallback(
    (message: string) => {
      handleSendMessage(message);
    },
    [handleSendMessage]
  );

  /**
   * Handle clearing the conversation
   */
  const handleClearConversation = useCallback(() => {
    clearConversation();
    setShowClearConfirm(false);
    setLocalError(null);
  }, [clearConversation]);

  /**
   * Toggle expanded state
   */
  const handleToggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  /**
   * Dismiss local error
   */
  const handleDismissError = useCallback(() => {
    setLocalError(null);
  }, []);

  // =========================================================================
  // Derived State
  // =========================================================================

  const isInputDisabled = isLoading || isStreaming;
  const displayError = localError || error;

  // =========================================================================
  // Render Helpers
  // =========================================================================

  /**
   * Render the message list with ChatMessage components
   */
  const renderMessages = () => {
    if (messages.length === 0) {
      return (
        <WelcomeMessage
          onPromptClick={handlePromptClick}
          disabled={isInputDisabled}
        />
      );
    }

    return (
      <>
        {messages.map((msg: Message) => {
          // Determine message status for ChatMessage component
          let status: 'sending' | 'sent' | 'error' | undefined;
          if (msg.streaming) {
            status = 'sending';
          } else if (msg.role === 'user') {
            status = 'sent';
          }

          return (
            <React.Fragment key={msg.id}>
              {/* Show tool call indicator for assistant messages with tools */}
              {msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0 && (
                <ToolCallIndicator toolCalls={msg.toolCalls} />
              )}
              <ChatMessage
                role={msg.role === 'system' ? 'assistant' : msg.role}
                content={msg.content}
                timestamp={msg.timestamp}
                status={status}
              />
            </React.Fragment>
          );
        })}

        {/* Show typing indicator when loading but no streaming message yet */}
        {isLoading && !isStreaming && <TypingIndicator />}

        {/* Invisible element for scroll-to-bottom */}
        <div ref={messagesEndRef} aria-hidden="true" />
      </>
    );
  };

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div
      className={`
        bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden
        flex flex-col
        ${collapsible && !isExpanded ? 'w-full' : 'w-full'}
        ${className}
      `}
      role="region"
      aria-label="AI Assistant Chat"
    >
      {/* Header */}
      <div
        className={`
          bg-gradient-to-r from-blue-500 to-purple-600 text-white
          px-4 py-3 flex items-center justify-between
          ${collapsible ? 'cursor-pointer' : ''}
        `}
        onClick={collapsible ? handleToggleExpand : undefined}
        onKeyDown={
          collapsible
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleToggleExpand();
                }
              }
            : undefined
        }
        role={collapsible ? 'button' : undefined}
        tabIndex={collapsible ? 0 : undefined}
        aria-expanded={collapsible ? isExpanded : undefined}
        aria-controls={collapsible ? 'ai-assistant-content' : undefined}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20">
            <Bot className="w-5 h-5 text-white" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-semibold text-sm sm:text-base">AI Assistant</h2>
            <p className="text-xs text-white/80 hidden sm:block">
              Your personal guide to META-STAMP
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Provider badge (hidden on mobile when collapsed) */}
          <div className={`${!isExpanded ? 'hidden sm:block' : ''}`}>
            <ProviderBadge provider={activeProvider} />
          </div>

          {/* Collapse/expand button */}
          {collapsible && (
            <button
              type="button"
              className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
              aria-label={isExpanded ? 'Collapse panel' : 'Expand panel'}
            >
              {isExpanded ? (
                <ChevronDown className="w-5 h-5" aria-hidden="true" />
              ) : (
                <ChevronUp className="w-5 h-5" aria-hidden="true" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Collapsible content */}
      <div
        id="ai-assistant-content"
        className={`
          transition-all duration-300 ease-in-out overflow-hidden
          ${isExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}
        `}
        aria-hidden={!isExpanded}
      >
        {/* Messages area */}
        <div
          ref={messagesContainerRef}
          className="h-80 sm:h-96 overflow-y-auto p-4 bg-gray-50"
          role="log"
          aria-live="polite"
          aria-label="Chat messages"
        >
          {/* Error display */}
          {displayError && (
            <ErrorDisplay
              error={displayError}
              onDismiss={handleDismissError}
            />
          )}

          {renderMessages()}
        </div>

        {/* Input area */}
        <div className="border-t border-gray-200 p-4 bg-white">
          {/* Clear conversation button row */}
          {messages.length > 0 && (
            <div className="flex justify-end mb-3">
              {showClearConfirm ? (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">Clear chat?</span>
                  <button
                    type="button"
                    onClick={handleClearConversation}
                    className="text-red-600 hover:text-red-800 font-medium"
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(false)}
                    className="text-gray-600 hover:text-gray-800"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                  aria-label="Clear conversation"
                >
                  <Trash2 className="w-3 h-3" aria-hidden="true" />
                  Clear
                </button>
              )}
            </div>
          )}

          {/* Input form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex gap-2"
          >
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about your assets..."
              disabled={isInputDisabled}
              rows={1}
              className={`
                flex-1 px-4 py-2.5 border border-gray-300 rounded-xl
                resize-none overflow-hidden
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed
                placeholder:text-gray-400
                text-sm sm:text-base
              `}
              style={{ minHeight: '44px', maxHeight: '120px' }}
              aria-label="Message input"
            />
            <button
              type="submit"
              disabled={isInputDisabled || !inputText.trim()}
              className={`
                flex items-center justify-center
                px-4 py-2.5 rounded-xl
                bg-blue-600 text-white
                hover:bg-blue-700
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                disabled:bg-gray-300 disabled:cursor-not-allowed
                transition-colors duration-200
              `}
              aria-label="Send message"
            >
              <Send className="w-5 h-5" aria-hidden="true" />
            </button>
          </form>

          {/* Keyboard hint */}
          <p className="text-xs text-gray-400 mt-2 hidden sm:block">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>

      {/* Collapsed state preview (optional - shows message count) */}
      {collapsible && !isExpanded && messages.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500 border-t">
          {messages.length} message{messages.length !== 1 ? 's' : ''} in conversation
        </div>
      )}
    </div>
  );
};

export default AIAssistant;
