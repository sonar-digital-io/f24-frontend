export type CalculationStatus = 'Draft' | 'Running' | 'Finished' | 'Failed' | 'Stopped';

export interface Calculation {
  id: string;
  name: string;
  description: string;
  /** Created/started time — used for the running-status elapsed-time badge. */
  timestamp: string;
  /** Raw ISO value for the "Last updated" column — sort/filter against this, format at render. */
  lastUpdated: string;
  status: CalculationStatus;
}
