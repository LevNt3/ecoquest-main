import {AlertCircle, CheckCircle2, Clock, Compass, PlayCircle, XCircle} from 'lucide-react';

interface StatusIndicatorProps {
  status: string;
}

export function StatusIndicator({status}: StatusIndicatorProps) {
  switch (status) {
    case 'completed':
    case 'approved':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 whitespace-nowrap shrink-0">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{status === 'completed' ? 'Completed' : 'Approved'}</span>
        </span>
      );
    case 'in_progress':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-lime-700 dark:text-lime-400 whitespace-nowrap shrink-0">
          <PlayCircle className="h-3.5 w-3.5" aria-hidden="true" />
          <span>In Progress</span>
        </span>
      );
    case 'needs_review':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 whitespace-nowrap shrink-0">
          <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Needs Review</span>
        </span>
      );
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap shrink-0">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Pending</span>
        </span>
      );
    case 'rejected':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-700 dark:text-rose-400 whitespace-nowrap shrink-0">
          <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Rejected</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap shrink-0">
          <Compass className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Available</span>
        </span>
      );
  }
}
