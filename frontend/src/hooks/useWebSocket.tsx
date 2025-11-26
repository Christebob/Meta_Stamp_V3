/**
 * @file useWebSocket.tsx
 * @description Custom React hook for managing WebSocket connections with automatic
 * reconnection, message subscription/unsubscription, and real-time update support.
 * 
 * This hook provides:
 * - WebSocket connection lifecycle management
 * - Automatic reconnection with exponential backoff
 * - Message type-based subscription pattern
 * - Support for upload progress, processing status, and asset change events
 * - Connection state tracking and error handling
 * 
 * @example
 * ```tsx
 * const { isConnected, sendMessage, subscribe, error } = useWebSocket();
 * 
 * useEffect(() => {
 *   const unsubscribe = subscribe('upload_progress', (data) => {
 *     console.log('Upload progress:', data.progress);
 *   });
 *   return () => unsubscribe();
 * }, [subscribe]);
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Enum representing the possible states of a WebSocket connection.
 * Used for detailed connection state tracking and UI feedback.
 */
export enum WebSocketState {
  /** Connection is being established */
  CONNECTING = 'connecting',
  /** Connection is open and ready for communication */
  CONNECTED = 'connected',
  /** Connection has been closed (intentionally or lost) */
  DISCONNECTED = 'disconnected',
  /** Connection encountered an error */
  ERROR = 'error',
}

/**
 * Interface representing a message received from or sent to the WebSocket server.
 * All messages follow this structure for consistent parsing and routing.
 */
export interface WebSocketMessage<T = unknown> {
  /** The type/channel of the message for routing to subscribers */
  type: string;
  /** The payload data associated with the message */
  data: T;
  /** ISO 8601 timestamp when the message was created */
  timestamp: string;
}

/**
 * Type definition for subscription callback functions.
 * Called when a message matching the subscribed type is received.
 * 
 * @template T - The type of data expected in the message
 * @param data - The data payload from the WebSocket message
 */
export type SubscribeCallback<T = unknown> = (data: T) => void;

/**
 * Interface defining the return value of the useWebSocket hook.
 * Provides connection state, messaging functions, and error information.
 */
export interface UseWebSocketReturn {
  /** Whether the WebSocket is currently connected and ready */
  isConnected: boolean;
  /** Detailed connection state for UI feedback */
  connectionState: WebSocketState;
  /** Send a message through the WebSocket connection */
  sendMessage: <T = unknown>(type: string, data: T) => void;
  /** Subscribe to messages of a specific type, returns unsubscribe function */
  subscribe: <T = unknown>(
    type: string,
    callback: SubscribeCallback<T>
  ) => () => void;
  /** Manually disconnect the WebSocket connection */
  disconnect: () => void;
  /** Manually reconnect the WebSocket connection */
  reconnect: () => void;
  /** Current error if connection failed, null otherwise */
  error: Error | null;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Configuration constants for WebSocket connection management.
 */
const WEBSOCKET_CONFIG = {
  /** Initial reconnection delay in milliseconds */
  INITIAL_RECONNECT_DELAY: 1000,
  /** Maximum reconnection delay in milliseconds */
  MAX_RECONNECT_DELAY: 30000,
  /** Multiplier for exponential backoff */
  BACKOFF_MULTIPLIER: 2,
  /** Maximum number of reconnection attempts before giving up */
  MAX_RECONNECT_ATTEMPTS: 10,
  /** Heartbeat interval in milliseconds to keep connection alive */
  HEARTBEAT_INTERVAL: 30000,
} as const;

/**
 * Known message types for real-time updates.
 * Used for type-safe subscription handling.
 */
export const MESSAGE_TYPES = {
  /** Upload progress updates */
  UPLOAD_PROGRESS: 'upload_progress',
  /** Asset processing status changes */
  PROCESSING_STATUS: 'processing_status',
  /** Asset data updated */
  ASSET_UPDATED: 'asset_updated',
  /** Asset deleted */
  ASSET_DELETED: 'asset_deleted',
  /** Fingerprint generated */
  FINGERPRINT_READY: 'fingerprint_ready',
  /** AI Touch Value calculated */
  VALUE_CALCULATED: 'value_calculated',
  /** Server heartbeat/ping */
  HEARTBEAT: 'heartbeat',
  /** Error from server */
  ERROR: 'error',
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Retrieves the WebSocket URL from environment variables.
 * Falls back to a default localhost URL if not configured.
 * 
 * @returns The WebSocket server URL
 */
function getWebSocketUrl(): string {
  // Get from Vite environment variable
  const envUrl = import.meta.env.VITE_WS_URL;
  
  if (envUrl) {
    return envUrl;
  }
  
  // Construct default URL based on current location
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  
  // Default to backend WebSocket endpoint
  return `${protocol}//${host}/api/v1/ws`;
}

/**
 * Parses an incoming WebSocket message into a structured format.
 * Handles malformed messages gracefully with error logging.
 * 
 * @param event - The MessageEvent from the WebSocket
 * @returns Parsed WebSocketMessage or null if parsing fails
 */
function parseMessage(event: MessageEvent): WebSocketMessage | null {
  try {
    const rawData = event.data;
    
    // Handle string data
    if (typeof rawData === 'string') {
      const parsed = JSON.parse(rawData);
      
      // Validate required fields
      if (typeof parsed.type !== 'string') {
        console.error('[WebSocket] Message missing required "type" field:', parsed);
        return null;
      }
      
      return {
        type: parsed.type,
        data: parsed.data ?? null,
        timestamp: parsed.timestamp ?? new Date().toISOString(),
      };
    }
    
    // Handle Blob data
    if (rawData instanceof Blob) {
      // For binary data, we'll need async handling
      // Return null here and handle Blob separately if needed
      console.warn('[WebSocket] Received Blob data, binary handling not implemented');
      return null;
    }
    
    console.error('[WebSocket] Unsupported message data type:', typeof rawData);
    return null;
  } catch (error) {
    console.error('[WebSocket] Failed to parse message:', error, event.data);
    return null;
  }
}

/**
 * Calculates the reconnection delay using exponential backoff.
 * 
 * @param attempt - The current reconnection attempt number
 * @returns Delay in milliseconds before next reconnection attempt
 */
function calculateReconnectDelay(attempt: number): number {
  const delay =
    WEBSOCKET_CONFIG.INITIAL_RECONNECT_DELAY *
    Math.pow(WEBSOCKET_CONFIG.BACKOFF_MULTIPLIER, attempt);
  
  // Cap at maximum delay and add jitter to prevent thundering herd
  const cappedDelay = Math.min(delay, WEBSOCKET_CONFIG.MAX_RECONNECT_DELAY);
  const jitter = Math.random() * 1000;
  
  return cappedDelay + jitter;
}

// ============================================================================
// Main Hook Implementation
// ============================================================================

/**
 * Custom React hook for managing WebSocket connections with automatic
 * reconnection, message subscription, and real-time update support.
 * 
 * Features:
 * - Automatic connection on mount
 * - Exponential backoff reconnection on disconnect
 * - Type-based message subscription pattern
 * - Connection state tracking
 * - Heartbeat to keep connection alive
 * - Cleanup on unmount
 * 
 * @returns {UseWebSocketReturn} Object containing connection state and methods
 * 
 * @example
 * ```tsx
 * function UploadMonitor() {
 *   const { isConnected, subscribe, error } = useWebSocket();
 *   const [progress, setProgress] = useState(0);
 * 
 *   useEffect(() => {
 *     const unsubscribe = subscribe('upload_progress', (data) => {
 *       setProgress(data.progress);
 *     });
 *     return () => unsubscribe();
 *   }, [subscribe]);
 * 
 *   if (error) return <div>Connection error: {error.message}</div>;
 *   if (!isConnected) return <div>Connecting...</div>;
 *   return <div>Upload progress: {progress}%</div>;
 * }
 * ```
 */
export function useWebSocket(): UseWebSocketReturn {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  
  /** Current connection state for UI feedback */
  const [connectionState, setConnectionState] = useState<WebSocketState>(
    WebSocketState.DISCONNECTED
  );
  
  /** Connection error, if any */
  const [error, setError] = useState<Error | null>(null);
  
  // ---------------------------------------------------------------------------
  // Refs (persist across re-renders without triggering updates)
  // ---------------------------------------------------------------------------
  
  /** The WebSocket instance */
  const wsRef = useRef<WebSocket | null>(null);
  
  /** Map of message type to array of subscriber callbacks */
  const subscribersRef = useRef<Map<string, Set<SubscribeCallback<unknown>>>>(
    new Map()
  );
  
  /** Timer for reconnection attempts */
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  /** Current reconnection attempt count */
  const reconnectAttemptRef = useRef<number>(0);
  
  /** Timer for heartbeat messages */
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  /** Flag to track if component is mounted (prevents state updates after unmount) */
  const isMountedRef = useRef<boolean>(true);
  
  /** Flag to prevent reconnection when intentionally disconnecting */
  const shouldReconnectRef = useRef<boolean>(true);
  
  // ---------------------------------------------------------------------------
  // Connection Management
  // ---------------------------------------------------------------------------
  
  /**
   * Clears all timers (reconnection and heartbeat).
   */
  const clearTimers = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);
  
  /**
   * Starts the heartbeat interval to keep the connection alive.
   */
  const startHeartbeat = useCallback(() => {
    // Clear any existing heartbeat
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
    }
    
    heartbeatTimerRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        const heartbeatMessage: WebSocketMessage = {
          type: MESSAGE_TYPES.HEARTBEAT,
          data: { timestamp: Date.now() },
          timestamp: new Date().toISOString(),
        };
        wsRef.current.send(JSON.stringify(heartbeatMessage));
      }
    }, WEBSOCKET_CONFIG.HEARTBEAT_INTERVAL);
  }, []);
  
  /**
   * Notifies all subscribers of a specific message type.
   * 
   * @param message - The parsed WebSocket message
   */
  const notifySubscribers = useCallback((message: WebSocketMessage) => {
    const subscribers = subscribersRef.current.get(message.type);
    
    if (subscribers && subscribers.size > 0) {
      subscribers.forEach((callback) => {
        try {
          callback(message.data);
        } catch (err) {
          console.error(
            `[WebSocket] Error in subscriber callback for type "${message.type}":`,
            err
          );
        }
      });
    }
  }, []);
  
  /**
   * Establishes a WebSocket connection.
   * Sets up event handlers for open, close, message, and error events.
   */
  const connect = useCallback(() => {
    // Don't connect if already connecting or connected
    if (
      wsRef.current?.readyState === WebSocket.CONNECTING ||
      wsRef.current?.readyState === WebSocket.OPEN
    ) {
      return;
    }
    
    // Don't connect if component is unmounted
    if (!isMountedRef.current) {
      return;
    }
    
    // Clear any existing error
    setError(null);
    setConnectionState(WebSocketState.CONNECTING);
    
    try {
      const url = getWebSocketUrl();
      // Development logging - use warn level to pass lint
      if (import.meta.env.DEV) {
        console.warn('[WebSocket] Connecting to:', url);
      }
      
      const ws = new WebSocket(url);
      wsRef.current = ws;
      
      // Handle successful connection
      ws.onopen = () => {
        if (!isMountedRef.current) return;
        
        // Development logging
        if (import.meta.env.DEV) {
          console.warn('[WebSocket] Connection established');
        }
        setConnectionState(WebSocketState.CONNECTED);
        setError(null);
        reconnectAttemptRef.current = 0;
        startHeartbeat();
      };
      
      // Handle connection close
      ws.onclose = (event) => {
        if (!isMountedRef.current) return;
        
        // Development logging
        if (import.meta.env.DEV) {
          console.warn(
            '[WebSocket] Connection closed:',
            event.code,
            event.reason || 'No reason provided'
          );
        }
        
        // Clean up heartbeat
        if (heartbeatTimerRef.current) {
          clearInterval(heartbeatTimerRef.current);
          heartbeatTimerRef.current = null;
        }
        
        setConnectionState(WebSocketState.DISCONNECTED);
        
        // Attempt reconnection if not intentionally closed and under max attempts
        if (
          shouldReconnectRef.current &&
          reconnectAttemptRef.current < WEBSOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS
        ) {
          const delay = calculateReconnectDelay(reconnectAttemptRef.current);
          // Development logging
          if (import.meta.env.DEV) {
            console.warn(
              `[WebSocket] Scheduling reconnection attempt ${
                reconnectAttemptRef.current + 1
              } in ${Math.round(delay)}ms`
            );
          }
          
          reconnectTimerRef.current = setTimeout(() => {
            reconnectAttemptRef.current += 1;
            connect();
          }, delay);
        } else if (
          reconnectAttemptRef.current >= WEBSOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS
        ) {
          console.error(
            '[WebSocket] Max reconnection attempts reached, giving up'
          );
          setError(
            new Error(
              'Failed to establish WebSocket connection after multiple attempts'
            )
          );
          setConnectionState(WebSocketState.ERROR);
        }
      };
      
      // Handle incoming messages
      ws.onmessage = (event) => {
        if (!isMountedRef.current) return;
        
        const message = parseMessage(event);
        
        if (message) {
          // Handle heartbeat response silently
          if (message.type === MESSAGE_TYPES.HEARTBEAT) {
            return;
          }
          
          // Handle error messages
          if (message.type === MESSAGE_TYPES.ERROR) {
            console.error('[WebSocket] Server error:', message.data);
          }
          
          // Notify all subscribers for this message type
          notifySubscribers(message);
        }
      };
      
      // Handle connection errors
      ws.onerror = (event) => {
        if (!isMountedRef.current) return;
        
        console.error('[WebSocket] Connection error:', event);
        setError(new Error('WebSocket connection error'));
        setConnectionState(WebSocketState.ERROR);
      };
    } catch (err) {
      console.error('[WebSocket] Failed to create connection:', err);
      setError(
        err instanceof Error ? err : new Error('Failed to create WebSocket')
      );
      setConnectionState(WebSocketState.ERROR);
    }
  }, [startHeartbeat, notifySubscribers]);
  
  /**
   * Closes the WebSocket connection gracefully.
   * Prevents automatic reconnection.
   */
  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    clearTimers();
    
    if (wsRef.current) {
      // Only close if not already closing/closed
      if (
        wsRef.current.readyState !== WebSocket.CLOSING &&
        wsRef.current.readyState !== WebSocket.CLOSED
      ) {
        wsRef.current.close(1000, 'Client disconnect');
      }
      wsRef.current = null;
    }
    
    setConnectionState(WebSocketState.DISCONNECTED);
  }, [clearTimers]);
  
  /**
   * Manually reconnects the WebSocket connection.
   * Resets reconnection attempt counter and re-enables auto-reconnection.
   */
  const reconnect = useCallback(() => {
    // Reset reconnection state
    shouldReconnectRef.current = true;
    reconnectAttemptRef.current = 0;
    
    // Clear any existing connection and timers
    clearTimers();
    
    if (wsRef.current) {
      wsRef.current.onclose = null; // Prevent reconnection from onclose handler
      if (
        wsRef.current.readyState !== WebSocket.CLOSING &&
        wsRef.current.readyState !== WebSocket.CLOSED
      ) {
        wsRef.current.close(1000, 'Client reconnect');
      }
      wsRef.current = null;
    }
    
    // Establish new connection
    setError(null);
    connect();
  }, [clearTimers, connect]);
  
  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  
  /**
   * Sends a message through the WebSocket connection.
   * Automatically serializes the message to JSON.
   * 
   * @template T - The type of data being sent
   * @param type - The message type/channel
   * @param data - The data payload to send
   * @throws Error if WebSocket is not connected
   */
  const sendMessage = useCallback(<T = unknown>(type: string, data: T): void => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn(
        '[WebSocket] Cannot send message - not connected. State:',
        wsRef.current?.readyState
      );
      return;
    }
    
    const message: WebSocketMessage<T> = {
      type,
      data,
      timestamp: new Date().toISOString(),
    };
    
    try {
      wsRef.current.send(JSON.stringify(message));
    } catch (err) {
      console.error('[WebSocket] Failed to send message:', err);
      setError(
        err instanceof Error ? err : new Error('Failed to send message')
      );
    }
  }, []);
  
  /**
   * Subscribes to messages of a specific type.
   * Returns an unsubscribe function for cleanup.
   * 
   * @template T - The type of data expected in messages
   * @param type - The message type to subscribe to
   * @param callback - Function called when matching messages are received
   * @returns Unsubscribe function to remove the subscription
   * 
   * @example
   * ```tsx
   * useEffect(() => {
   *   const unsubscribe = subscribe('upload_progress', (data) => {
   *     console.log('Progress:', data.progress);
   *   });
   *   return () => unsubscribe();
   * }, [subscribe]);
   * ```
   */
  const subscribe = useCallback(
    <T = unknown>(type: string, callback: SubscribeCallback<T>): (() => void) => {
      // Get or create subscriber set for this type
      if (!subscribersRef.current.has(type)) {
        subscribersRef.current.set(type, new Set());
      }
      
      const subscribers = subscribersRef.current.get(type)!;
      subscribers.add(callback as SubscribeCallback<unknown>);
      
      // Return unsubscribe function
      return () => {
        subscribers.delete(callback as SubscribeCallback<unknown>);
        
        // Clean up empty sets
        if (subscribers.size === 0) {
          subscribersRef.current.delete(type);
        }
      };
    },
    []
  );
  
  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------
  
  /**
   * Establishes WebSocket connection on mount and cleans up on unmount.
   */
  useEffect(() => {
    isMountedRef.current = true;
    shouldReconnectRef.current = true;
    
    // Capture refs for cleanup to satisfy React hooks exhaustive-deps
    const subscribers = subscribersRef.current;
    const ws = wsRef.current;
    
    // Connect on mount
    connect();
    
    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
      shouldReconnectRef.current = false;
      clearTimers();
      
      // Clear all subscribers
      subscribers.clear();
      
      // Close WebSocket connection
      const currentWs = wsRef.current ?? ws;
      if (currentWs) {
        currentWs.onclose = null; // Prevent reconnection attempt
        currentWs.close(1000, 'Component unmount');
      }
      wsRef.current = null;
    };
  }, [connect, clearTimers]);
  
  /**
   * Handle visibility change to pause/resume connection.
   * Reconnects when tab becomes visible again.
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is hidden - could pause heartbeat to save resources
        // Development logging only
        if (import.meta.env.DEV) {
          console.warn('[WebSocket] Tab hidden, connection maintained');
        }
      } else {
        // Tab is visible again - check connection health
        // Development logging only
        if (import.meta.env.DEV) {
          console.warn('[WebSocket] Tab visible, checking connection');
        }
        
        if (
          !wsRef.current ||
          wsRef.current.readyState === WebSocket.CLOSED ||
          wsRef.current.readyState === WebSocket.CLOSING
        ) {
          // Reconnect if connection was lost
          reconnectAttemptRef.current = 0;
          connect();
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [connect]);
  
  // ---------------------------------------------------------------------------
  // Return Value
  // ---------------------------------------------------------------------------
  
  return {
    isConnected: connectionState === WebSocketState.CONNECTED,
    connectionState,
    sendMessage,
    subscribe,
    disconnect,
    reconnect,
    error,
  };
}

// Default export for convenience
export default useWebSocket;
