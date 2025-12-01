/**
 * Usage Meter Component
 *
 * Displays usage progress bars for subscription limits
 */

import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';

interface UsageMeterProps {
  label: string;
  current: number;
  limit: number | null; // null means unlimited
  unit?: string;
  showWarning?: boolean;
  className?: string;
}

export function UsageMeter({
  label,
  current,
  limit,
  unit = 'items',
  showWarning = true,
  className = '',
}: UsageMeterProps) {
  // Calculate percentage
  const isUnlimited = limit === null;
  const percentUsed = isUnlimited ? 0 : Math.min((current / limit) * 100, 100);
  const remaining = isUnlimited ? null : Math.max(0, limit - current);

  // Determine color based on usage
  const getColor = () => {
    if (isUnlimited) return 'bg-green-500';
    if (percentUsed >= 100) return 'bg-red-500';
    if (percentUsed >= 90) return 'bg-orange-500';
    if (percentUsed >= 75) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const getTextColor = () => {
    if (isUnlimited) return 'text-green-700';
    if (percentUsed >= 90) return 'text-red-700';
    if (percentUsed >= 75) return 'text-orange-700';
    return 'text-gray-700';
  };

  const showAlert = showWarning && !isUnlimited && percentUsed >= 90;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-900">{label}</span>
        <div className="flex items-center gap-2">
          {showAlert && (
            <AlertCircle className="h-4 w-4 text-orange-500" />
          )}
          <span className={`text-sm font-medium ${getTextColor()}`}>
            {current} / {isUnlimited ? '∞' : limit}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative">
        <Progress
          value={percentUsed}
          className={`h-2 ${percentUsed >= 90 ? 'bg-red-100' : percentUsed >= 75 ? 'bg-yellow-100' : 'bg-gray-100'}`}
        />
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between">
        {isUnlimited ? (
          <span className="text-xs text-green-600 font-medium">Unlimited</span>
        ) : (
          <>
            <span className="text-xs text-gray-500">
              {remaining !== null && remaining > 0 ? `${remaining} ${unit} remaining` : 'Limit reached'}
            </span>
            {percentUsed > 0 && (
              <span className="text-xs text-gray-500">
                {Math.round(percentUsed)}% used
              </span>
            )}
          </>
        )}
      </div>

      {/* Warning Message */}
      {showAlert && (
        <div className="flex items-start gap-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs">
          <AlertCircle className="h-3 w-3 text-orange-600 mt-0.5 flex-shrink-0" />
          <span className="text-orange-800">
            You're running low on {label.toLowerCase()}. Consider upgrading your plan.
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Compact Usage Badge
 *
 * Shows usage in a compact badge format
 */
interface UsageBadgeProps {
  current: number;
  limit: number | null;
  variant?: 'default' | 'detailed';
}

export function UsageBadge({ current, limit, variant = 'default' }: UsageBadgeProps) {
  const isUnlimited = limit === null;
  const percentUsed = isUnlimited ? 0 : (current / limit) * 100;

  const getBadgeColor = () => {
    if (isUnlimited) return 'bg-green-100 text-green-800 border-green-200';
    if (percentUsed >= 90) return 'bg-red-100 text-red-800 border-red-200';
    if (percentUsed >= 75) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

  if (variant === 'detailed') {
    return (
      <div className="inline-flex items-center gap-1">
        <Badge variant="outline" className={getBadgeColor()}>
          {current} / {isUnlimited ? '∞' : limit}
        </Badge>
        {!isUnlimited && percentUsed >= 90 && (
          <AlertCircle className="h-3 w-3 text-orange-500" />
        )}
      </div>
    );
  }

  return (
    <Badge variant="outline" className={getBadgeColor()}>
      {current}{!isUnlimited && ` / ${limit}`}
    </Badge>
  );
}

/**
 * Usage Summary Card
 *
 * Displays multiple usage meters in a summary format
 */
interface UsageSummaryProps {
  metrics: Array<{
    label: string;
    current: number;
    limit: number | null;
    unit?: string;
  }>;
  className?: string;
}

export function UsageSummary({ metrics, className = '' }: UsageSummaryProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {metrics.map((metric, index) => (
        <UsageMeter
          key={index}
          label={metric.label}
          current={metric.current}
          limit={metric.limit}
          unit={metric.unit}
        />
      ))}
    </div>
  );
}
