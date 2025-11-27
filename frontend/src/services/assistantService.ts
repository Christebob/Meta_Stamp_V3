/**
 * AI Assistant Service for META-STAMP V3
 *
 * Provides functions for interacting with the LangChain multi-provider AI assistant
 * backend. Features include:
 * - Streaming Server-Sent Events (SSE) support for real-time responses
 * - Conversation history retrieval for context restoration
 * - Tool call visualization support for fingerprint and analytics queries
 * - Error handling with retry logic for network interruptions
 *
 * The assistant can query:
 * - Fingerprint data for assets
 * - Analytics calculations and AI Touch Value™ projections
 * - General guidance and legal advisory information
 *
 * @module services/assistantService
 */

import apiClient from './api';
import { getToken } from './storageService';

// ============================================================================
// Configuration Constants
// ============================================================================

/**
 * Default API base URL when VITE_API_URL is not set
 */
const DEFAULT_BASE_URL = 'http://localhost:8000';

/**
 * Maximum number of retry attempts for failed streaming requests
 */
const MAX_RETRY_ATTEMPTS = 3;

/**
 * Base delay for exponential backoff in milliseconds
 */
const RETRY_BASE_DELAY = 1000;

/**
 * Timeout for SSE connection establishment in milliseconds
 */
const SSE_CONNECT_TIMEOUT = 30000;

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Represents a tool call made by the AI assistant
 * Tools enable the assistant to query fingerprint and analytics data
 */
export interface ToolCall {
  /** Name of the tool being called (e.g., 'fingerprint_lookup', 'analytics_query') */
  name: string;
  /** Arguments passed to the tool as key-value pairs */
  arguments: Record<string, unknown>;
  /** Result returned from the tool execution (populated after completion) */
  result?: unknown;
}

/**
 * Represents a single message in the conversation
 */
export interface Message {
  /** Unique identifier for the message */
  id: string;
  /** Role of the message author */
  role: 'user' | 'assistant';
  /** Text content of the message */
  content: string;
  /** ISO 8601 timestamp when the message was created */
  timestamp: string;
  /** Array of tool calls made during this message (assistant only) */
  toolCalls?: ToolCall[];
}

/**
 * Represents a chunk of data received from the SSE stream
 */
export interface StreamChunk {
  /** Type of the stream chunk */
  type: 'token' | 'tool_call' | 'tool_result' | 'error' | 'done';
  /** Content payload of the chunk */
  content: string;
  /** Tool call data (only present for tool_call type) */
  toolCall?: ToolCall;
}

/**
 * Conversation history response from the backend
 */
export interface ConversationHistory {
  /** Unique identifier for the conversation */
  conversationId: string;
  /** Array of messages in chronological order */
  messages: Message[];
  /** ISO 8601 timestamp of the last message */
  lastUpdated: string;
  /** Metadata about the conversation */
  metadata?: {
    /** Number of messages in the conversation */
    messageCount: number;
    /** Whether the conversation has tool calls */
    hasToolCalls: boolean;
  };
}

/**
 * Request payload for sending a message to the assistant
 */
interface SendMessageRequest {
  /** The user's message content */
  message: string;
  /** Optional conversation ID for continuing a conversation */
  conversation_id?: string;
}

/**
 * Error response structure from the assistant endpoint
 */
interface AssistantErrorResponse {
  /** Error message */
  message?: string;
  /** Detailed error description */
  detail?: string;
  /** Error code for programmatic handling */
  code?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Gets the base URL for API requests from environment or defaults
 * @returns The base URL string
 */
function getBaseUrl(): string {
  return (
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
    DEFAULT_BASE_URL
  );
}

/**
 * Creates a promise that resolves after the specified delay
 * Used for exponential backoff retry logic
 *
 * @param ms - Delay in milliseconds
 * @returns Promise that resolves after the delay
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculates the delay before the next retry attempt using exponential backoff
 *
 * @param attemptNumber - The current retry attempt number (1-based)
 * @returns Delay in milliseconds
 */
function calculateRetryDelay(attemptNumber: number): number {
  // Exponential backoff: 1s, 2s, 4s
  return RETRY_BASE_DELAY * Math.pow(2, attemptNumber - 1);
}

/**
 * Parses an SSE data line into a StreamChunk object
 *
 * @param line - The raw SSE data line (after 'data: ' prefix removed)
 * @returns Parsed StreamChunk or null if parsing fails
 */
function parseSSEData(line: string): StreamChunk | null {
  if (!line || line.trim() === '') {
    return null;
  }

  try {
    const parsed = JSON.parse(line);

    // Handle different chunk types from the backend
    if (parsed.type) {
      return {
        type: parsed.type,
        content: parsed.content || '',
        toolCall: parsed.tool_call,
      };
    }

    // Handle simple token responses (just content string)
    if (typeof parsed.content === 'string') {
      return {
        type: 'token',
        content: parsed.content,
      };
    }

    // Handle legacy/fallback format
    if (typeof parsed === 'string') {
      return {
        type: 'token',
        content: parsed,
      };
    }

    return null;
  } catch {
    // If JSON parsing fails, treat the line as plain text token
    return {
      type: 'token',
      content: line,
    };
  }
}

/**
 * Creates an AbortController with timeout for SSE requests
 *
 * @returns Object containing the controller and cleanup function
 */
function createTimeoutController(): {
  controller: AbortController;
  cleanup: () => void;
} {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, SSE_CONNECT_TIMEOUT);

  return {
    controller,
    cleanup: () => clearTimeout(timeoutId),
  };
}

// ============================================================================
// Main Service Functions
// ============================================================================

/**
 * Sends a message to the AI assistant and returns a streaming response
 *
 * This function uses the native fetch API with Server-Sent Events (SSE)
 * to receive incremental responses from the LangChain multi-provider backend.
 * The streaming approach enables real-time display of assistant responses
 * as they are generated.
 *
 * @param message - The user's message to send to the assistant
 * @param conversationId - Optional ID to continue an existing conversation
 * @returns AsyncGenerator yielding StreamChunk objects
 *
 * @example
 * ```typescript
 * // Basic usage with streaming
 * const stream = sendMessage('What is my asset fingerprint status?');
 * for await (const chunk of stream) {
 *   if (chunk.type === 'token') {
 *     console.log(chunk.content);
 *   } else if (chunk.type === 'tool_call') {
 *     console.log('Tool called:', chunk.toolCall);
 *   } else if (chunk.type === 'done') {
 *     console.log('Stream complete');
 *   }
 * }
 *
 * // Continue existing conversation
 * const stream = sendMessage('Tell me more', 'conv-123');
 * ```
 *
 * @throws Error if the request fails after all retry attempts
 * @throws Error if authentication token is missing
 */
export async function* sendMessage(
  message: string,
  conversationId?: string
): AsyncGenerator<StreamChunk, void, unknown> {
  // Validate input
  if (!message || typeof message !== 'string' || message.trim() === '') {
    throw new Error('Message content is required and must be a non-empty string');
  }

  // Get authentication token for the request
  const token = getToken();
  if (!token) {
    throw new Error('Authentication required. Please log in to use the assistant.');
  }

  // Prepare request payload
  const requestPayload: SendMessageRequest = {
    message: message.trim(),
  };

  if (conversationId) {
    requestPayload.conversation_id = conversationId;
  }

  // Build the full URL for the streaming endpoint
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/api/v1/assistant/ask`;

  // Retry loop for handling transient failures
  let lastError: Error | null = null;
  let attemptNumber = 0;

  while (attemptNumber < MAX_RETRY_ATTEMPTS) {
    attemptNumber++;

    try {
      // Create timeout controller for this attempt
      const { controller, cleanup } = createTimeoutController();

      try {
        // Make the streaming request using fetch
        // We use fetch instead of axios because axios doesn't support
        // streaming response bodies as well as the native fetch API
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache',
          },
          body: JSON.stringify(requestPayload),
          signal: controller.signal,
        });

        // Clear the connection timeout since we got a response
        cleanup();

        // Check for HTTP errors
        if (!response.ok) {
          let errorMessage = `Request failed with status ${response.status}`;

          try {
            const errorData: AssistantErrorResponse = await response.json();
            errorMessage = errorData.detail || errorData.message || errorMessage;
          } catch {
            // Ignore JSON parse errors, use default message
          }

          // Handle specific error codes
          if (response.status === 401) {
            throw new Error('Session expired. Please log in again.');
          }
          if (response.status === 403) {
            throw new Error('You do not have permission to use the assistant.');
          }
          if (response.status === 429) {
            throw new Error('Too many requests. Please wait a moment and try again.');
          }
          if (response.status >= 500) {
            // Server errors are retryable
            throw new Error(`Server error: ${errorMessage}`);
          }

          // Client errors (4xx) are not retryable
          throw new Error(errorMessage);
        }

        // Get the response body as a readable stream
        const body = response.body;
        if (!body) {
          throw new Error('Response body is empty');
        }

        // Create a reader for the stream
        const reader = body.getReader();
        const decoder = new TextDecoder('utf-8');

        // Buffer for incomplete lines across chunks
        let buffer = '';

        try {
          // Read and process the stream
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              // Process any remaining data in the buffer
              if (buffer.trim()) {
                const lines = buffer.split('\n');
                for (const line of lines) {
                  const chunk = processSSELine(line);
                  if (chunk) {
                    yield chunk;
                  }
                }
              }

              // Yield a done chunk to signal stream completion
              yield { type: 'done', content: '' };
              return;
            }

            // Decode the chunk and add to buffer
            buffer += decoder.decode(value, { stream: true });

            // Process complete lines from the buffer
            const lines = buffer.split('\n');

            // Keep the last potentially incomplete line in the buffer
            buffer = lines.pop() || '';

            // Process each complete line
            for (const line of lines) {
              const chunk = processSSELine(line);
              if (chunk) {
                yield chunk;

                // If we receive an error chunk, throw to trigger retry
                if (chunk.type === 'error') {
                  throw new Error(chunk.content || 'Stream error from server');
                }
              }
            }
          }
        } finally {
          // Ensure we always release the reader
          reader.releaseLock();
        }
      } catch (error) {
        cleanup();
        throw error;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if error is retryable
      const isRetryable =
        lastError.message.includes('Server error') ||
        lastError.message.includes('network') ||
        lastError.message.includes('timeout') ||
        lastError.message.includes('aborted');

      // Don't retry non-retryable errors
      if (!isRetryable) {
        throw lastError;
      }

      // Log retry attempt
      console.warn(
        `Assistant request failed, attempt ${attemptNumber}/${MAX_RETRY_ATTEMPTS}:`,
        lastError.message
      );

      // Wait before retrying (except for last attempt)
      if (attemptNumber < MAX_RETRY_ATTEMPTS) {
        const retryDelay = calculateRetryDelay(attemptNumber);
        await delay(retryDelay);
      }
    }
  }

  // All retry attempts exhausted
  throw lastError || new Error('Failed to send message after all retry attempts');
}

/**
 * Processes a single SSE line and returns a StreamChunk if valid
 *
 * @param line - The raw line from the SSE stream
 * @returns StreamChunk or null if line should be skipped
 */
function processSSELine(line: string): StreamChunk | null {
  // Skip empty lines (SSE uses blank lines as delimiters)
  if (!line || line.trim() === '') {
    return null;
  }

  // Skip comment lines (SSE allows lines starting with :)
  if (line.startsWith(':')) {
    return null;
  }

  // Handle event type lines (we primarily care about data lines)
  if (line.startsWith('event:')) {
    // Event type is handled implicitly in the data parsing
    return null;
  }

  // Process data lines
  if (line.startsWith('data:')) {
    const data = line.slice(5).trim();

    // Check for stream end signal
    if (data === '[DONE]') {
      return { type: 'done', content: '' };
    }

    return parseSSEData(data);
  }

  // For lines without a prefix, try to parse as data
  // This handles some non-standard SSE implementations
  return parseSSEData(line);
}

/**
 * Retrieves the conversation history for a specific conversation
 *
 * Fetches all previous messages in a conversation, including both user
 * and assistant messages with their timestamps and any tool calls.
 * Used for context restoration when resuming a conversation.
 *
 * @param conversationId - The unique identifier of the conversation
 * @returns Promise resolving to an array of Message objects
 *
 * @example
 * ```typescript
 * const history = await getConversationHistory('conv-123');
 * console.log(`Conversation has ${history.length} messages`);
 * history.forEach(msg => {
 *   console.log(`[${msg.role}]: ${msg.content}`);
 * });
 * ```
 *
 * @throws Error if conversationId is invalid
 * @throws Error if the conversation is not found
 * @throws Error if the user doesn't have access to the conversation
 */
export async function getConversationHistory(
  conversationId: string
): Promise<Message[]> {
  // Validate input
  if (!conversationId || typeof conversationId !== 'string') {
    throw new Error('Conversation ID is required');
  }

  // Sanitize conversation ID to prevent path traversal
  const sanitizedId = encodeURIComponent(conversationId.trim());
  if (!sanitizedId) {
    throw new Error('Invalid conversation ID');
  }

  try {
    // Use apiClient.get() for authenticated request with retry logic
    // The apiClient automatically adds the Authorization header and handles errors
    // Note: The apiClient response interceptor unwraps the data, so the response
    // is the actual data, not an AxiosResponse wrapper
    const response = await apiClient.get<ConversationHistory>(
      `/api/v1/assistant/conversations/${sanitizedId}`
    );

    // The apiClient interceptor unwraps AxiosResponse.data, so we cast accordingly
    // This handles the transformed response from our interceptor
    const data = response as unknown as ConversationHistory | Message[];

    // Handle the response - apiClient unwraps the data automatically
    // but we need to handle both wrapped and unwrapped responses
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      // If data is a ConversationHistory object with messages array
      if ('messages' in data && Array.isArray(data.messages)) {
        return data.messages;
      }
    }

    // If response is somehow an array of messages directly
    if (Array.isArray(data)) {
      return data as Message[];
    }

    // Return empty array if response format is unexpected
    console.warn('Unexpected response format from conversation history endpoint');
    return [];
  } catch (error) {
    // Re-throw with more context
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to retrieve conversation history';

    // Handle specific error cases
    if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      throw new Error(`Conversation '${conversationId}' not found`);
    }

    throw new Error(`Failed to load conversation: ${errorMessage}`);
  }
}

// ============================================================================
// Service Object Export
// ============================================================================

/**
 * AI Assistant Service object providing all assistant-related functions
 *
 * This object groups all assistant service functions together for
 * convenient importing and use throughout the application.
 *
 * @example
 * ```typescript
 * import assistantService from './assistantService';
 *
 * // Send a message with streaming
 * const stream = assistantService.sendMessage('Hello');
 * for await (const chunk of stream) {
 *   console.log(chunk.content);
 * }
 *
 * // Get conversation history
 * const history = await assistantService.getConversationHistory('conv-123');
 * ```
 */
const assistantService = {
  /**
   * Send a message to the AI assistant with streaming SSE response
   */
  sendMessage,

  /**
   * Retrieve conversation history for context restoration
   */
  getConversationHistory,
};

export default assistantService;
