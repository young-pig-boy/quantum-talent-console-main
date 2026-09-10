import { getJobStatus, getPublicationStatus, getLeadStatus, getApplicationStage, getCompanyStatus } from '@/lib/status';

type StatusBadgeProps = {
  type: 'job' | 'publication' | 'lead' | 'application' | 'company' | 'talent';
  value: string | undefined;
};

export function StatusBadge({ type, value }: StatusBadgeProps) {
  const option =
    type === 'job'
      ? getJobStatus(value)
      : type === 'publication'
        ? getPublicationStatus(value)
        : type === 'lead'
          ? getLeadStatus(value)
          : type === 'application'
            ? getApplicationStage(value)
            : getCompanyStatus(value);

  return <span className={option.className}>{option.label}</span>;
}
