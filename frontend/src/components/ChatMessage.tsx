/**
 * ChatMessage Component
 *
 * Individual chat message bubble component for the AI assistant interface.
 * Displays user or assistant messages with distinct visual styling, markdown
 * content rendering, timestamps, and status indicators.
 *
 * @module components/ChatMessage
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { AlertCircle, Check, Loader2 } from 'lucide-react';

/**
 * Props interface for the ChatMessage component
 *
 * @interface MessageProps
 * @property {('user'|'assistant')} role - The role of the message sender
 * @property {string} content - The message content in markdown format
 * @property {Date} timestamp - When the message was sent
 * @property {('sending'|'sent'|'error')} [status] - Optional message delivery status
 */
export interface MessageProps {
  /** The role of the message sender - determines visual alignment and styling */
  role: 'user' | 'assistant';
  /** The message content, supports markdown formatting */
  content: string;
  /** Timestamp when the message was created */
  timestamp: Date;
  /** Optional status indicator for message delivery state */
  status?: 'sending' | 'sent' | 'error';
}

/**
 * Formats a Date object into a user-friendly time string
 *
 * @param {Date} date - The date to format
 * @returns {string} Formatted time string (e.g., "10:30 AM")
 */
const formatTimestamp = (date: Date): string => {
  // Ensure we have a valid Date object
  const validDate = date instanceof Date ? date : new Date(date);

  // Check if the date is valid
  if (isNaN(validDate.getTime())) {
    return '';
  }

  return validDate.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Renders the appropriate status icon based on message status
 *
 * @param {MessageProps['status']} status - The current message status
 * @returns {React.ReactNode} The status indicator icon or null
 */
const StatusIndicator: React.FC<{ status?: MessageProps['status'] }> = ({ status }) => {
  if (!status) {
    return null;
  }

  switch (status) {
    case 'sending':
      return (
        <Loader2
          className="w-3 h-3 text-gray-400 animate-spin"
          aria-label="Message sending"
        />
      );
    case 'sent':
      return (
        <Check
          className="w-3 h-3 text-green-500"
          aria-label="Message sent"
        />
      );
    case 'error':
      return (
        <AlertCircle
          className="w-3 h-3 text-red-500"
          aria-label="Message failed to send"
        />
      );
    default:
      return null;
  }
};

/**
 * ChatMessage Component
 *
 * Renders an individual chat message bubble with role-based styling,
 * markdown content support, timestamps, and delivery status indicators.
 *
 * Features:
 * - Role-based alignment (user: right, assistant: left)
 * - Markdown rendering with XSS protection via react-markdown
 * - Timestamp display in user-friendly format
 * - Status indicators (sending spinner, sent checkmark, error icon)
 * - Responsive design with TailwindCSS
 * - Accessibility support with ARIA labels
 *
 * @param {MessageProps} props - The component props
 * @returns {React.ReactElement} The rendered ChatMessage component
 *
 * @example
 * ```tsx
 * <ChatMessage
 *   role="user"
 *   content="Hello, how can you help me?"
 *   timestamp={new Date()}
 *   status="sent"
 * />
 * ```
 */
const ChatMessage: React.FC<MessageProps> = ({
  role,
  content,
  timestamp,
  status,
}) => {
  const isUser = role === 'user';

  // Container classes for alignment based on role
  const containerClasses = `
    flex flex-col mb-4
    ${isUser ? 'items-end' : 'items-start'}
  `.trim();

  // Message wrapper classes for alignment
  const wrapperClasses = `
    flex
    ${isUser ? 'justify-end' : 'justify-start'}
    w-full
  `.trim();

  // Bubble styling based on role
  const bubbleClasses = `
    max-w-[70%] sm:max-w-[70%] max-w-[85%]
    rounded-2xl px-4 py-3 shadow-sm
    ${isUser
      ? 'bg-blue-600 text-white ml-auto rounded-br-md'
      : 'bg-gray-200 text-gray-900 mr-auto rounded-bl-md'
    }
  `.trim();

  // Timestamp and status row styling
  const metaClasses = `
    flex items-center gap-2 mt-1
    ${isUser ? 'justify-end' : 'justify-start'}
  `.trim();

  // Custom components for ReactMarkdown to ensure proper styling
  const markdownComponents = {
    // Style paragraphs
    p: ({ children }: { children?: React.ReactNode }) => (
      <p className="mb-2 last:mb-0">{children}</p>
    ),
    // Style strong/bold text
    strong: ({ children }: { children?: React.ReactNode }) => (
      <strong className="font-semibold">{children}</strong>
    ),
    // Style emphasis/italic text
    em: ({ children }: { children?: React.ReactNode }) => (
      <em className="italic">{children}</em>
    ),
    // Style inline code
    code: ({ children, className }: { children?: React.ReactNode; className?: string }) => {
      // Check if this is a code block (has language class) or inline code
      const isCodeBlock = className?.includes('language-');
      
      if (isCodeBlock) {
        return (
          <code
            className={`
              block p-3 my-2 rounded-lg overflow-x-auto
              ${isUser
                ? 'bg-blue-700 text-blue-100'
                : 'bg-gray-800 text-gray-100'
              }
              font-mono text-sm
            `}
          >
            {children}
          </code>
        );
      }

      return (
        <code
          className={`
            px-1.5 py-0.5 rounded font-mono text-sm
            ${isUser
              ? 'bg-blue-700 text-blue-100'
              : 'bg-gray-300 text-gray-800'
            }
          `}
        >
          {children}
        </code>
      );
    },
    // Style code blocks (pre elements)
    pre: ({ children }: { children?: React.ReactNode }) => (
      <pre
        className={`
          p-3 my-2 rounded-lg overflow-x-auto
          ${isUser
            ? 'bg-blue-700'
            : 'bg-gray-800'
          }
          font-mono text-sm
        `}
      >
        {children}
      </pre>
    ),
    // Style links
    a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`
          underline hover:no-underline
          ${isUser
            ? 'text-blue-200 hover:text-white'
            : 'text-blue-600 hover:text-blue-800'
          }
        `}
      >
        {children}
      </a>
    ),
    // Style unordered lists
    ul: ({ children }: { children?: React.ReactNode }) => (
      <ul className="list-disc list-inside my-2 space-y-1">{children}</ul>
    ),
    // Style ordered lists
    ol: ({ children }: { children?: React.ReactNode }) => (
      <ol className="list-decimal list-inside my-2 space-y-1">{children}</ol>
    ),
    // Style list items
    li: ({ children }: { children?: React.ReactNode }) => (
      <li className="ml-2">{children}</li>
    ),
    // Style blockquotes
    blockquote: ({ children }: { children?: React.ReactNode }) => (
      <blockquote
        className={`
          border-l-4 pl-3 my-2 italic
          ${isUser
            ? 'border-blue-400 text-blue-100'
            : 'border-gray-400 text-gray-600'
          }
        `}
      >
        {children}
      </blockquote>
    ),
    // Style horizontal rules
    hr: () => (
      <hr
        className={`
          my-3 border-t
          ${isUser ? 'border-blue-400' : 'border-gray-300'}
        `}
      />
    ),
    // Style headings
    h1: ({ children }: { children?: React.ReactNode }) => (
      <h1 className="text-lg font-bold mb-2">{children}</h1>
    ),
    h2: ({ children }: { children?: React.ReactNode }) => (
      <h2 className="text-base font-bold mb-2">{children}</h2>
    ),
    h3: ({ children }: { children?: React.ReactNode }) => (
      <h3 className="text-sm font-bold mb-1">{children}</h3>
    ),
  };

  return (
    <div
      className={containerClasses}
      aria-label={`${role === 'user' ? 'Your' : 'Assistant'} message`}
    >
      <div className={wrapperClasses}>
        <div
          className={bubbleClasses}
          role="article"
          aria-label={`Message from ${role}`}
        >
          {/* Markdown content with safe rendering */}
          <div className="prose prose-sm max-w-none break-words">
            <ReactMarkdown components={markdownComponents}>
              {content}
            </ReactMarkdown>
          </div>
        </div>
      </div>

      {/* Timestamp and status row */}
      <div className={metaClasses}>
        <span
          className="text-xs text-gray-500"
          aria-label={`Sent at ${formatTimestamp(timestamp)}`}
        >
          {formatTimestamp(timestamp)}
        </span>

        {/* Status indicator for user messages */}
        {isUser && status && (
          <StatusIndicator status={status} />
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
