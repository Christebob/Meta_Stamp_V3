/**
 * TransactionHistory Component for META-STAMP V3
 *
 * A comprehensive transaction history table component displaying wallet transaction
 * records with sortable columns, filterable transaction types, pagination controls,
 * status badges with color coding, expandable row details, date range filtering,
 * search functionality, and CSV export capabilities.
 *
 * Features:
 * - Sortable columns (date, amount) with visual indicators
 * - Filterable by transaction type (earnings, payouts, adjustments, all)
 * - Pagination with configurable page sizes (10, 25, 50, 100)
 * - Status badges (completed: green, pending: yellow, failed: red)
 * - Expandable rows for additional transaction details
 * - Date range filtering for time-based queries
 * - Search functionality for descriptions
 * - CSV export for downloading records
 * - Responsive design: table on desktop, cards on mobile
 *
 * Based on Agent Action Plan sections 0.3 (React 18 + TypeScript + TailwindCSS),
 * 0.4 (Transaction history with filtering, sorting, pagination), and 0.6
 * (TransactionHistory.tsx specification).
 *
 * @module components/TransactionHistory
 */

import { useState, useMemo, useCallback } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Search,
  Calendar,
  X,
  Wallet,
  TrendingUp,
  TrendingDown,
  Circle,
  Check,
  Clock,
  AlertCircle,
  MoreHorizontal,
} from 'lucide-react';
import {
  Transaction,
  TransactionType,
  TransactionStatus,
} from '../types/wallet';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Sort field options for transaction table columns.
 */
type SortField = 'date' | 'amount';

/**
 * Sort direction for column ordering.
 */
type SortDirection = 'asc' | 'desc';

/**
 * Filter type including 'all' option for showing all transactions.
 */
type FilterType = 'all' | TransactionType;

/**
 * Props interface for TransactionHistory component.
 */
interface TransactionHistoryProps {
  /** Array of transactions to display */
  transactions: Transaction[];
  /** Loading state indicator */
  isLoading?: boolean;
  /** Callback when filter type changes */
  onFilterChange?: (type: FilterType) => void;
  /** Callback when sort changes */
  onSortChange?: (field: SortField, direction: SortDirection) => void;
  /** Callback when page changes */
  onPageChange?: (page: number) => void;
  /** Optional class name for styling */
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Formats a date string into a human-readable format.
 * @param dateString - ISO date string or Date object
 * @returns Formatted date string (e.g., "Nov 26, 2025")
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Formats a date string into relative time (e.g., "2 hours ago").
 * @param dateString - ISO date string
 * @returns Relative time string
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  } else {
    return formatDate(dateString);
  }
}

/**
 * Formats a full datetime string for expanded details.
 * @param dateString - ISO date string
 * @returns Full datetime string
 */
function formatFullDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

/**
 * Formats currency amount with proper sign and styling.
 * @param amount - Transaction amount
 * @param includeSign - Whether to include +/- sign
 * @returns Formatted currency string
 */
function formatCurrency(amount: number, includeSign = true): string {
  const absAmount = Math.abs(amount).toFixed(2);
  const formatted = `$${absAmount.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  if (includeSign && amount > 0) {
    return `+${formatted}`;
  }
  if (includeSign && amount < 0) {
    return `-${formatted}`;
  }
  return formatted;
}

/**
 * Converts transactions to CSV format for export.
 * @param transactions - Array of transactions to export
 * @returns CSV formatted string
 */
function transactionsToCSV(transactions: Transaction[]): string {
  const headers = ['Date', 'Type', 'Description', 'Amount', 'Status', 'Transaction ID'];
  const rows = transactions.map((t) => [
    formatDate(t.created_at),
    t.type,
    `"${t.description.replace(/"/g, '""')}"`,
    t.amount.toFixed(2),
    t.status,
    t.id,
  ]);
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Downloads content as a file.
 * @param content - File content
 * @param filename - Name for the downloaded file
 * @param mimeType - MIME type of the file
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Status badge component with color coding.
 */
function StatusBadge({ status }: { status: TransactionStatus }): JSX.Element {
  const config: Record<
    TransactionStatus,
    { bg: string; text: string; icon: JSX.Element; label: string }
  > = {
    [TransactionStatus.COMPLETED]: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      icon: <Check className="w-3 h-3" />,
      label: 'Completed',
    },
    [TransactionStatus.PENDING]: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      icon: <Clock className="w-3 h-3" />,
      label: 'Pending',
    },
    [TransactionStatus.FAILED]: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      icon: <X className="w-3 h-3" />,
      label: 'Failed',
    },
    [TransactionStatus.CANCELLED]: {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      icon: <AlertCircle className="w-3 h-3" />,
      label: 'Cancelled',
    },
  };

  const { bg, text, icon, label } = config[status];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${bg} ${text}`}
      role="status"
      aria-label={`Status: ${label}`}
    >
      {icon}
      {label}
    </span>
  );
}

/**
 * Transaction type badge with icon.
 */
function TypeBadge({ type }: { type: TransactionType }): JSX.Element {
  const config: Record<TransactionType, { bg: string; text: string; icon: JSX.Element; label: string }> = {
    [TransactionType.EARNING]: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      icon: <TrendingUp className="w-3 h-3" />,
      label: 'Earning',
    },
    [TransactionType.PAYOUT]: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      icon: <TrendingDown className="w-3 h-3" />,
      label: 'Payout',
    },
    [TransactionType.ADJUSTMENT]: {
      bg: 'bg-slate-50',
      text: 'text-slate-700',
      icon: <Circle className="w-3 h-3" />,
      label: 'Adjustment',
    },
    [TransactionType.BONUS]: {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      icon: <TrendingUp className="w-3 h-3" />,
      label: 'Bonus',
    },
    [TransactionType.REFUND]: {
      bg: 'bg-orange-50',
      text: 'text-orange-700',
      icon: <TrendingUp className="w-3 h-3" />,
      label: 'Refund',
    },
  };

  const { bg, text, icon, label } = config[type];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${bg} ${text}`}
    >
      {icon}
      {label}
    </span>
  );
}

/**
 * Sort button for table headers.
 */
function SortButton({
  field,
  currentField,
  direction,
  onClick,
  children,
}: {
  field: SortField;
  currentField: SortField;
  direction: SortDirection;
  onClick: (field: SortField) => void;
  children: React.ReactNode;
}): JSX.Element {
  const isActive = field === currentField;

  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 hover:text-gray-900 transition-colors"
      onClick={() => onClick(field)}
      aria-label={`Sort by ${field}, currently ${isActive ? direction : 'unsorted'}`}
    >
      {children}
      {!isActive && <ArrowUpDown className="w-4 h-4 text-gray-400" />}
      {isActive && direction === 'asc' && <ArrowUp className="w-4 h-4 text-blue-600" />}
      {isActive && direction === 'desc' && <ArrowDown className="w-4 h-4 text-blue-600" />}
    </button>
  );
}

/**
 * Loading skeleton row for table.
 */
function SkeletonRow(): JSX.Element {
  return (
    <tr className="border-b">
      <td className="px-4 py-3">
        <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
      </td>
      <td className="px-4 py-3">
        <div className="h-6 bg-gray-200 rounded-full animate-pulse w-20" />
      </td>
      <td className="px-4 py-3">
        <div className="h-4 bg-gray-200 rounded animate-pulse w-16" />
      </td>
      <td className="px-4 py-3">
        <div className="h-6 bg-gray-200 rounded-full animate-pulse w-24" />
      </td>
      <td className="px-4 py-3">
        <div className="h-8 bg-gray-200 rounded animate-pulse w-8" />
      </td>
    </tr>
  );
}

/**
 * Loading skeleton card for mobile view.
 */
function SkeletonCard(): JSX.Element {
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-3">
      <div className="flex justify-between items-start mb-3">
        <div className="h-6 bg-gray-200 rounded-full animate-pulse w-20" />
        <div className="h-4 bg-gray-200 rounded animate-pulse w-16" />
      </div>
      <div className="h-4 bg-gray-200 rounded animate-pulse w-full mb-2" />
      <div className="flex justify-between items-center">
        <div className="h-5 bg-gray-200 rounded animate-pulse w-20" />
        <div className="h-6 bg-gray-200 rounded-full animate-pulse w-24" />
      </div>
    </div>
  );
}

/**
 * Empty state component when no transactions are found.
 */
function EmptyState(): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Wallet className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-1">No transactions found</h3>
      <p className="text-gray-500 mb-4 max-w-sm">
        You haven&apos;t made any transactions yet, or no transactions match your current filters.
      </p>
      <p className="text-sm text-gray-400">Upload assets to start earning</p>
    </div>
  );
}

/**
 * Expanded row details component.
 */
function TransactionDetails({ transaction }: { transaction: Transaction }): JSX.Element {
  return (
    <div className="bg-gray-50 px-4 py-3 border-t border-gray-100">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-500">Transaction ID:</span>
          <span className="ml-2 font-mono text-gray-900">{transaction.id}</span>
        </div>
        <div>
          <span className="text-gray-500">Created:</span>
          <span className="ml-2 text-gray-900">{formatFullDateTime(transaction.created_at)}</span>
        </div>
        {transaction.processed_at && (
          <div>
            <span className="text-gray-500">Processed:</span>
            <span className="ml-2 text-gray-900">
              {formatFullDateTime(transaction.processed_at)}
            </span>
          </div>
        )}
        <div className="md:col-span-2">
          <span className="text-gray-500">Description:</span>
          <span className="ml-2 text-gray-900">{transaction.description}</span>
        </div>
        {transaction.metadata && Object.keys(transaction.metadata).length > 0 && (
          <div className="md:col-span-2">
            <span className="text-gray-500 block mb-1">Additional Details:</span>
            <div className="bg-white rounded border border-gray-200 p-2">
              {Object.entries(transaction.metadata).map(([key, value]) => (
                <div key={key} className="flex gap-2">
                  <span className="text-gray-500 capitalize">
                    {key.replace(/_/g, ' ')}:
                  </span>
                  <span className="text-gray-900">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Mobile card view for a single transaction.
 */
function TransactionCard({
  transaction,
  isExpanded,
  onToggle,
}: {
  transaction: Transaction;
  isExpanded: boolean;
  onToggle: () => void;
}): JSX.Element {
  const isPositive = transaction.amount > 0;

  return (
    <div className="bg-white rounded-lg shadow mb-3 overflow-hidden">
      <button
        type="button"
        className="w-full text-left p-4"
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-label={`Transaction ${transaction.id}, ${isExpanded ? 'collapse' : 'expand'} details`}
      >
        <div className="flex justify-between items-start mb-2">
          <TypeBadge type={transaction.type} />
          <span className="text-xs text-gray-500">{formatRelativeTime(transaction.created_at)}</span>
        </div>
        <p className="text-sm text-gray-700 line-clamp-2 mb-3">{transaction.description}</p>
        <div className="flex justify-between items-center">
          <span
            className={`text-lg font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}
          >
            {formatCurrency(transaction.amount)}
          </span>
          <StatusBadge status={transaction.status} />
        </div>
      </button>
      {isExpanded && <TransactionDetails transaction={transaction} />}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * TransactionHistory displays a comprehensive view of wallet transactions
 * with filtering, sorting, pagination, and responsive design.
 *
 * @param props - Component props
 * @returns Transaction history table/list component
 */
export default function TransactionHistory({
  transactions,
  isLoading = false,
  onFilterChange,
  onSortChange,
  onPageChange,
  className = '',
}: TransactionHistoryProps): JSX.Element {
  // State management
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Calculate transaction counts by type for filter tabs
  const typeCounts = useMemo(() => {
    const counts: Record<FilterType, number> = {
      all: transactions.length,
      [TransactionType.EARNING]: 0,
      [TransactionType.PAYOUT]: 0,
      [TransactionType.ADJUSTMENT]: 0,
      [TransactionType.BONUS]: 0,
      [TransactionType.REFUND]: 0,
    };
    transactions.forEach((t) => {
      counts[t.type]++;
    });
    return counts;
  }, [transactions]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Type filter
      if (filterType !== 'all' && t.type !== filterType) {
        return false;
      }
      // Search filter
      if (searchQuery && !t.description.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      // Date range filter
      if (startDate) {
        const txDate = new Date(t.created_at);
        const filterStart = new Date(startDate);
        if (txDate < filterStart) return false;
      }
      if (endDate) {
        const txDate = new Date(t.created_at);
        const filterEnd = new Date(endDate);
        filterEnd.setHours(23, 59, 59, 999);
        if (txDate > filterEnd) return false;
      }
      return true;
    });
  }, [transactions, filterType, searchQuery, startDate, endDate]);

  // Sort transactions
  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date') {
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortField === 'amount') {
        comparison = a.amount - b.amount;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredTransactions, sortField, sortDirection]);

  // Paginate transactions
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedTransactions.slice(start, start + pageSize);
  }, [sortedTransactions, currentPage, pageSize]);

  // Calculate pagination info
  const totalPages = Math.ceil(sortedTransactions.length / pageSize);
  const showingStart = sortedTransactions.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const showingEnd = Math.min(currentPage * pageSize, sortedTransactions.length);

  // Handle filter change
  const handleFilterChange = useCallback(
    (type: FilterType) => {
      setFilterType(type);
      setCurrentPage(1);
      onFilterChange?.(type);
    },
    [onFilterChange]
  );

  // Handle sort change
  const handleSortChange = useCallback(
    (field: SortField) => {
      let newDirection: SortDirection = 'desc';
      if (sortField === field) {
        newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      }
      setSortField(field);
      setSortDirection(newDirection);
      onSortChange?.(field, newDirection);
    },
    [sortField, sortDirection, onSortChange]
  );

  // Handle page change
  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(page);
      onPageChange?.(page);
    },
    [onPageChange]
  );

  // Handle page size change
  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  // Handle row expand toggle
  const toggleRowExpand = useCallback((id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Handle CSV export
  const handleExport = useCallback(() => {
    const csv = transactionsToCSV(sortedTransactions);
    const filename = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    downloadFile(csv, filename, 'text/csv;charset=utf-8;');
  }, [sortedTransactions]);

  // Handle clear filters
  const handleClearFilters = useCallback(() => {
    setFilterType('all');
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  }, []);

  // Check if any filters are active
  const hasActiveFilters = filterType !== 'all' || searchQuery || startDate || endDate;

  // Generate page numbers for pagination
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('ellipsis');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('ellipsis');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('ellipsis');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('ellipsis');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  // Filter tab configuration
  const filterTabs: { type: FilterType; label: string; color: string }[] = [
    { type: 'all', label: 'All', color: 'gray' },
    { type: TransactionType.EARNING, label: 'Earnings', color: 'green' },
    { type: TransactionType.PAYOUT, label: 'Payouts', color: 'blue' },
    { type: TransactionType.ADJUSTMENT, label: 'Adjustments', color: 'slate' },
  ];

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header with filters */}
      <div className="p-4 border-b border-gray-200">
        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {filterTabs.map(({ type, label, color }) => (
            <button
              key={type}
              type="button"
              onClick={() => handleFilterChange(type)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filterType === type
                  ? `bg-${color}-100 text-${color}-800 border-2 border-${color}-300`
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-transparent'
              }`}
              aria-pressed={filterType === type}
            >
              {label}
              <span
                className={`px-1.5 py-0.5 rounded-full text-xs ${
                  filterType === type ? `bg-${color}-200` : 'bg-gray-200'
                }`}
              >
                {typeCounts[type]}
              </span>
            </button>
          ))}
        </div>

        {/* Search and date filters */}
        <div className="flex flex-wrap gap-3">
          {/* Search input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Search transactions"
            />
          </div>

          {/* Date range inputs */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="Start date"
              />
            </div>
            <span className="text-gray-400">to</span>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="End date"
              />
            </div>
          </div>

          {/* Clear filters button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <X className="w-4 h-4" />
              Clear filters
            </button>
          )}

          {/* Export button */}
          <button
            type="button"
            onClick={handleExport}
            disabled={sortedTransactions.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Export transactions to CSV"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Table view (desktop) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                <SortButton
                  field="date"
                  currentField={sortField}
                  direction={sortDirection}
                  onClick={handleSortChange}
                >
                  Date
                </SortButton>
              </th>
              <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                Type
              </th>
              <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                <SortButton
                  field="amount"
                  currentField={sortField}
                  direction={sortDirection}
                  onClick={handleSortChange}
                >
                  Amount
                </SortButton>
              </th>
              <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                Status
              </th>
              <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-gray-600">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <>
                {Array.from({ length: 10 }).map((_, i) => (
                  <SkeletonRow key={`skeleton-${i}`} />
                ))}
              </>
            )}

            {!isLoading && paginatedTransactions.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <EmptyState />
                </td>
              </tr>
            )}

            {!isLoading &&
              paginatedTransactions.map((transaction) => {
                const isExpanded = expandedRows.has(transaction.id);
                const isPositive = transaction.amount > 0;

                return (
                  <tbody key={transaction.id}>
                    <tr
                      className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                        isExpanded ? 'bg-gray-50' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-900">
                            {formatDate(transaction.created_at)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatRelativeTime(transaction.created_at)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <TypeBadge type={transaction.type} />
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-sm font-semibold ${
                            isPositive ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {formatCurrency(transaction.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={transaction.status} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => toggleRowExpand(transaction.id)}
                          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} transaction details`}
                          aria-expanded={isExpanded}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-gray-500" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                          )}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={5}>
                          <TransactionDetails transaction={transaction} />
                        </td>
                      </tr>
                    )}
                  </tbody>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Card view (mobile) */}
      <div className="md:hidden p-4">
        {isLoading && (
          <>
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonCard key={`skeleton-card-${i}`} />
            ))}
          </>
        )}

        {!isLoading && paginatedTransactions.length === 0 && <EmptyState />}

        {!isLoading &&
          paginatedTransactions.map((transaction) => (
            <TransactionCard
              key={transaction.id}
              transaction={transaction}
              isExpanded={expandedRows.has(transaction.id)}
              onToggle={() => toggleRowExpand(transaction.id)}
            />
          ))}
      </div>

      {/* Pagination */}
      {!isLoading && sortedTransactions.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-4 py-3 border-t border-gray-200 bg-gray-50">
          {/* Page size selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="page-size" className="text-sm text-gray-600">
              Show:
            </label>
            <select
              id="page-size"
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-sm text-gray-600">per page</span>
          </div>

          {/* Page info */}
          <div className="text-sm text-gray-600">
            Showing <span className="font-medium">{showingStart}</span> to{' '}
            <span className="font-medium">{showingEnd}</span> of{' '}
            <span className="font-medium">{sortedTransactions.length}</span> transactions
          </div>

          {/* Page navigation */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {getPageNumbers().map((page, index) =>
              page === 'ellipsis' ? (
                <span key={`ellipsis-${index}`} className="px-2 text-gray-400">
                  <MoreHorizontal className="w-4 h-4" />
                </span>
              ) : (
                <button
                  key={page}
                  type="button"
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-gray-200 text-gray-700'
                  }`}
                  aria-label={`Page ${page}`}
                  aria-current={currentPage === page ? 'page' : undefined}
                >
                  {page}
                </button>
              )
            )}

            <button
              type="button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
