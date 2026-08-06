export type CalculationStatus = 'Draft' | 'Running' | 'Finished' | 'Failed' | 'Stopped';

export interface Calculation {
  id: string;
  name: string;
  description: string;
  timestamp: string;
  status: CalculationStatus;
}
