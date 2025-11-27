/**
 * AI Assistant Chat Conversation Hook for META-STAMP V3
 *
 * Custom React hook managing AI assistant chat conversations including:
 * - Message history with role-based distinction (user/assistant/system)
 * - Streaming response handling with incremental UI updates
 * - Tool call visualization for fingerprint and analytics queries
 * - Conversation context persistence across component remounts
 * - Loading and error state management
 * - Retry functionality for failed requests
 *
 * The hook integrates with the LangChain multi-provider AI assistant backend
 * supporting OpenAI GPT-4/5, Anthropic Claude, and Google Gemini models.
 *
 * @module hooks/useAIAssistant
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import assistantService from '@/services/assistantService';
import { storageService } from '@/services/storageService';

// ============================================================================
// Storage Keys
// ============================================================================

/**
 * localStorage key for persisting conversation messages
 */
const CONVERSATION_STORAGE_KEY = 'metastamp_conversation';

/**
 * localStorage key for persisting conversation ID
 */
const CONVERSATION_ID_STORAGE_KEY = 'metastamp_conversation_id';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Represents a tool call made by the AI assistant during message processing.
 * Tools enable the assistant to query fingerprint data, analytics, and other
 * system information to provide informed responses.
 */
export interface ToolCall {
  /** Name of the tool being called (e.g., 'get_fingerprint', 'query_analytics') */
  name: string;
  /** Arguments passed to the tool as key-value pairs */
  arguments: Record<string, unknown>;
  /** Result returned from the tool execution (populated after completion) */
  result: unknown | null;
}

/**
 * Represents a single message in the conversation.
 * Messages can be from the user, assistant, or system (for notifications/errors).
 */
export interface Message {
  /** Unique identifier for the message */
  id: string;
  /** Role of the message author - user, assistant, or system */
  role: 'user' | 'assistant' | 'system';
  /** Text content of the message */
  content: string;
  /** Timestamp when the message was created */
  timestamp: Date;
  /** Whether the message is currently being streamed (assistant messages only) */
  streaming: boolean;
  /** Array of tool calls made during this message (assistant messages only) */
  toolCalls: ToolCall[] | null;
}

/**
 * Return type interface for the useAIAssistant hook.
 * Provides all state values and functions needed to manage AI conversations.
 */
export interface UseAIAssistantReturn {
  /** Array of all messages in the current conversation */
  messages: Message[];
  /** Whether waiting for initial response from assistant */
  isLoading: boolean;
  /** Whether currently receiving streamed response chunks */
  isStreaming: boolean;
  /** Error message if last operation failed, null otherwise */
  error: string | null;
  /** Unique identifier for the current conversation session */
  conversationId: string | null;
  /** Function to send a new message to the assistant */
  sendMessage: (content: string) => Promise<void>;
  /** Function to clear all conversation history and reset state */
  clearConversation: () => void;
  /** Function to retry sending the last user message after an error */
  retryLastMessage: () => Promise<void>;
}

/**
 * Shape of conversation data stored in localStorage
 */
interface StoredConversation {
  messages: Array<{
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
    streaming: boolean;
    toolCalls: ToolCall[] | null;
  }>;
  conversationId: string | null;
  lastUpdated: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generates a unique identifier for messages using crypto API or fallback
 * @returns A unique string identifier
 */
function generateMessageId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Creates a new Message object with default values
 * @param role - The message author role
 * @param content - The message text content
 * @param streaming - Whether the message is being streamed
 * @returns A complete Message object
 */
function createMessage(
  role: 'user' | 'assistant' | 'system',
  content: string,
  streaming: boolean = false
): Message {
  return {
    id: generateMessageId(),
    role,
    content,
    timestamp: new Date(),
    streaming,
    toolCalls: role === 'assistant' ? [] : null,
  };
}

/**
 * Serializes messages for localStorage storage
 * Converts Date objects to ISO strings for JSON compatibility
 * @param messages - Array of messages to serialize
 * @returns Serializable array of messages
 */
function serializeMessages(
  messages: Message[]
): StoredConversation['messages'] {
  return messages.map((msg) => ({
    ...msg,
    timestamp: msg.timestamp.toISOString(),
  }));
}

/**
 * Deserializes messages from localStorage storage
 * Converts ISO strings back to Date objects
 * @param stored - Array of stored message objects
 * @returns Array of Message objects with proper Date timestamps
 */
function deserializeMessages(
  stored: StoredConversation['messages']
): Message[] {
  return stored.map((msg) => ({
    ...msg,
    timestamp: new Date(msg.timestamp),
  }));
}

/**
 * Loads persisted conversation from localStorage
 * @returns The stored conversation data or null if not found
 */
function loadStoredConversation(): {
  messages: Message[];
  conversationId: string | null;
} | null {
  const stored = storageService.getItem<StoredConversation>(
    CONVERSATION_STORAGE_KEY
  );

  if (!stored || !stored.messages || !Array.isArray(stored.messages)) {
    return null;
  }

  try {
    // Validate and clean up any incomplete streaming messages
    const cleanedMessages = stored.messages.map((msg) => ({
      ...msg,
      streaming: false, // Reset streaming state on load
    }));

    return {
      messages: deserializeMessages(cleanedMessages),
      conversationId: stored.conversationId || null,
    };
  } catch (error) {
    console.warn('Failed to deserialize stored conversation:', error);
    return null;
  }
}

/**
 * Saves conversation to localStorage for persistence
 * @param messages - Current message array
 * @param conversationId - Current conversation ID
 */
function saveConversation(
  messages: Message[],
  conversationId: string | null
): void {
  const data: StoredConversation = {
    messages: serializeMessages(messages),
    conversationId,
    lastUpdated: new Date().toISOString(),
  };

  storageService.setItem(CONVERSATION_STORAGE_KEY, data);
}

/**
 * Clears persisted conversation from localStorage
 */
function clearStoredConversation(): void {
  storageService.removeItem(CONVERSATION_STORAGE_KEY);
  storageService.removeItem(CONVERSATION_ID_STORAGE_KEY);
}

// ============================================================================
// Main Hook Implementation
// ============================================================================

/**
 * Custom React hook for managing AI assistant chat conversations.
 *
 * Provides comprehensive state management for chat interactions including:
 * - Message history with automatic persistence to localStorage
 * - Real-time streaming response handling with incremental UI updates
 * - Tool call visualization for system queries
 * - Error handling with retry capabilities
 * - Loading state indicators for UI feedback
 *
 * @returns {UseAIAssistantReturn} Object containing conversation state and control functions
 *
 * @example
 * ```tsx
 * function ChatComponent() {
 *   const {
 *     messages,
 *     isLoading,
 *     isStreaming,
 *     error,
 *     sendMessage,
 *     clearConversation,
 *     retryLastMessage,
 *   } = useAIAssistant();
 *
 *   const handleSend = async (text: string) => {
 *     await sendMessage(text);
 *   };
 *
 *   return (
 *     <div>
 *       {messages.map((msg) => (
 *         <ChatMessage key={msg.id} message={msg} />
 *       ))}
 *       {isStreaming && <StreamingIndicator />}
 *       {error && <ErrorMessage error={error} onRetry={retryLastMessage} />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useAIAssistant(): UseAIAssistantReturn {
  // =========================================================================
  // State Management
  // =========================================================================

  /** Conversation message history */
  const [messages, setMessages] = useState<Message[]>([]);

  /** Loading state - waiting for initial response */
  const [isLoading, setIsLoading] = useState<boolean>(false);

  /** Streaming state - receiving chunked response */
  const [isStreaming, setIsStreaming] = useState<boolean>(false);

  /** Error state - last error message or null */
  const [error, setError] = useState<string | null>(null);

  /** Conversation session identifier */
  const [conversationId, setConversationId] = useState<string | null>(null);

  // =========================================================================
  // Refs for Stable References
  // =========================================================================

  /**
   * Ref to track the current streaming message ID
   * Used to update the correct message during streaming without re-renders
   */
  const streamingMessageIdRef = useRef<string | null>(null);

  /**
   * Ref to store the last user message content for retry functionality
   */
  const lastUserMessageRef = useRef<string | null>(null);

  /**
   * Ref to track if component is mounted to prevent state updates after unmount
   */
  const isMountedRef = useRef<boolean>(true);

  /**
   * Ref to hold AbortController for cancelling ongoing requests
   */
  const abortControllerRef = useRef<AbortController | null>(null);

  // =========================================================================
  // Initialization Effect
  // =========================================================================

  /**
   * Load persisted conversation from localStorage on mount
   * and clean up on unmount
   */
  useEffect(() => {
    isMountedRef.current = true;

    // Load stored conversation on mount
    const stored = loadStoredConversation();
    if (stored) {
      setMessages(stored.messages);
      setConversationId(stored.conversationId);
    }

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;

      // Cancel any ongoing streaming request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  // =========================================================================
  // Persistence Effect
  // =========================================================================

  /**
   * Save conversation to localStorage whenever messages or conversationId change
   * Debounced slightly to avoid excessive writes
   */
  useEffect(() => {
    // Skip saving if no messages or during initial load
    if (messages.length === 0) {
      return;
    }

    // Save conversation with slight debounce
    const timeoutId = setTimeout(() => {
      saveConversation(messages, conversationId);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [messages, conversationId]);

  // =========================================================================
  // Message Update Helper
  // =========================================================================

  /**
   * Updates a specific message in the messages array by ID
   * Used for updating streaming messages with new content/tool calls
   */
  const updateMessage = useCallback(
    (messageId: string, updates: Partial<Message>) => {
      if (!isMountedRef.current) return;

      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === messageId ? { ...msg, ...updates } : msg
        )
      );
    },
    []
  );

  // =========================================================================
  // Send Message Function
  // =========================================================================

  /**
   * Sends a message to the AI assistant and handles the streaming response.
   *
   * This function:
   * 1. Validates input and adds user message to conversation
   * 2. Creates a placeholder assistant message for streaming
   * 3. Initiates the streaming API call
   * 4. Processes incoming chunks (tokens and tool calls)
   * 5. Updates the assistant message incrementally
   * 6. Handles errors and updates state accordingly
   *
   * @param content - The user's message text
   * @throws Never throws - errors are captured in error state
   */
  const sendMessage = useCallback(
    async (content: string): Promise<void> => {
      // Validate input
      const trimmedContent = content.trim();
      if (!trimmedContent) {
        setError('Please enter a message');
        return;
      }

      // Clear any previous error
      setError(null);

      // Store for potential retry
      lastUserMessageRef.current = trimmedContent;

      // Create and add user message
      const userMessage = createMessage('user', trimmedContent);
      setMessages((prev) => [...prev, userMessage]);

      // Set loading states
      setIsLoading(true);
      setIsStreaming(false);

      // Create placeholder assistant message
      const assistantMessage = createMessage('assistant', '', true);
      streamingMessageIdRef.current = assistantMessage.id;

      setMessages((prev) => [...prev, assistantMessage]);

      try {
        // Get the streaming response generator
        const stream = assistantService.sendMessage(trimmedContent, conversationId ?? undefined);

        // Track if we've started receiving content
        let hasReceivedContent = false;
        let accumulatedContent = '';
        const toolCalls: ToolCall[] = [];

        // Process the stream
        for await (const chunk of stream) {
          // Check if component is still mounted
          if (!isMountedRef.current) {
            break;
          }

          // First chunk received - switch from loading to streaming
          if (!hasReceivedContent && chunk.type === 'token') {
            hasReceivedContent = true;
            setIsLoading(false);
            setIsStreaming(true);
          }

          // Handle different chunk types
          switch (chunk.type) {
            case 'token':
              // Append new content to accumulated content
              accumulatedContent += chunk.content;

              // Update the streaming message with new content
              if (streamingMessageIdRef.current) {
                updateMessage(streamingMessageIdRef.current, {
                  content: accumulatedContent,
                });
              }
              break;

            case 'tool_call':
              // Handle tool call events for visualization
              if (chunk.toolCall) {
                const newToolCall: ToolCall = {
                  name: chunk.toolCall.name,
                  arguments: chunk.toolCall.arguments,
                  result: null,
                };
                toolCalls.push(newToolCall);

                // Update message with tool calls
                if (streamingMessageIdRef.current) {
                  updateMessage(streamingMessageIdRef.current, {
                    toolCalls: [...toolCalls],
                  });
                }
              }
              break;

            case 'tool_result':
              // Handle tool execution result
              if (chunk.toolCall && toolCalls.length > 0) {
                // Find and update the corresponding tool call with result
                const toolName = chunk.toolCall.name;
                const toolIndex = toolCalls.findIndex(
                  (tc) => tc.name === toolName && tc.result === null
                );

                if (toolIndex !== -1) {
                  const existingToolCall = toolCalls[toolIndex];
                  if (existingToolCall) {
                    const updatedToolCall: ToolCall = {
                      name: existingToolCall.name,
                      arguments: existingToolCall.arguments,
                      result: chunk.toolCall.result ?? chunk.content,
                    };
                    toolCalls[toolIndex] = updatedToolCall;

                    if (streamingMessageIdRef.current) {
                      updateMessage(streamingMessageIdRef.current, {
                        toolCalls: [...toolCalls],
                      });
                    }
                  }
                }
              }
              break;

            case 'error':
              // Handle error chunk from stream
              throw new Error(chunk.content || 'Unknown error from assistant');

            case 'done':
              // Stream completed successfully
              if (streamingMessageIdRef.current) {
                updateMessage(streamingMessageIdRef.current, {
                  streaming: false,
                  content: accumulatedContent,
                  toolCalls: toolCalls.length > 0 ? toolCalls : null,
                });
              }
              break;

            default:
              // Ignore unknown chunk types
              break;
          }
        }

        // Ensure message is marked as complete after stream ends
        if (isMountedRef.current && streamingMessageIdRef.current) {
          updateMessage(streamingMessageIdRef.current, {
            streaming: false,
          });
        }

        // Generate conversation ID if not already set
        if (!conversationId) {
          const newConversationId = generateMessageId();
          setConversationId(newConversationId);
        }
      } catch (err) {
        // Handle errors
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'An unexpected error occurred. Please try again.';

        if (isMountedRef.current) {
          setError(errorMessage);

          // Mark the assistant message as failed with error content
          if (streamingMessageIdRef.current) {
            updateMessage(streamingMessageIdRef.current, {
              streaming: false,
              content:
                'Sorry, I encountered an error processing your request. Please try again.',
            });
          }
        }
      } finally {
        // Clean up loading states
        if (isMountedRef.current) {
          setIsLoading(false);
          setIsStreaming(false);
          streamingMessageIdRef.current = null;
        }
      }
    },
    [conversationId, updateMessage]
  );

  // =========================================================================
  // Clear Conversation Function
  // =========================================================================

  /**
   * Clears all conversation history and resets the hook state.
   *
   * This function:
   * 1. Clears all messages from state
   * 2. Resets the conversation ID
   * 3. Clears error state
   * 4. Removes persisted data from localStorage
   * 5. Cancels any ongoing streaming requests
   */
  const clearConversation = useCallback((): void => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Reset all state
    setMessages([]);
    setConversationId(null);
    setError(null);
    setIsLoading(false);
    setIsStreaming(false);
    streamingMessageIdRef.current = null;
    lastUserMessageRef.current = null;

    // Clear persisted conversation
    clearStoredConversation();
  }, []);

  // =========================================================================
  // Retry Last Message Function
  // =========================================================================

  /**
   * Retries sending the last user message after an error.
   *
   * This function is useful when a network error or temporary failure
   * prevented the previous message from being processed. It:
   * 1. Verifies there was a previous user message
   * 2. Removes the failed assistant message from history
   * 3. Removes the last user message (it will be re-added by sendMessage)
   * 4. Re-sends the original message
   *
   * @throws Never throws - errors are captured in error state
   */
  const retryLastMessage = useCallback(async (): Promise<void> => {
    // Check if there's a message to retry
    if (!lastUserMessageRef.current) {
      setError('No message to retry');
      return;
    }

    const messageToRetry = lastUserMessageRef.current;

    // Clear error state
    setError(null);

    // Remove the failed assistant message and the last user message
    // We need to remove both because sendMessage will add them again
    setMessages((prev) => {
      // Find and remove the last two messages (user + assistant)
      if (prev.length >= 2) {
        const lastTwo = prev.slice(-2);
        const secondToLast = lastTwo[0];
        const last = lastTwo[1];
        // Verify the pattern is correct (user then assistant)
        if (
          secondToLast &&
          last &&
          secondToLast.role === 'user' &&
          last.role === 'assistant'
        ) {
          return prev.slice(0, -2);
        }
      }
      // If pattern doesn't match, just remove the last message
      return prev.slice(0, -1);
    });

    // Re-send the message
    await sendMessage(messageToRetry);
  }, [sendMessage]);

  // =========================================================================
  // Return Hook Interface
  // =========================================================================

  return {
    messages,
    isLoading,
    isStreaming,
    error,
    conversationId,
    sendMessage,
    clearConversation,
    retryLastMessage,
  };
}

// Default export for convenience
export default useAIAssistant;
