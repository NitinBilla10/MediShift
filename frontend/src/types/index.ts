export interface ShiftRequirement {
  id: string;
  shift_id: string;
  role_name: string;
  count_required: number;
}

export interface ShiftClaim {
  id: string;
  shift_id: string;
  user_id: string;
  role_name: string;
  claimed_at: string;
}

export interface Shift {
  id: string;
  start_time: string;
  end_time: string;
  created_by_id: string;
  created_at: string;
  updated_at: string;
  requirements: ShiftRequirement[];
  claims: ShiftClaim[];
}

export interface ImportError {
  id: string;
  row_number?: number;
  original_row?: string;
  problem: string;
  action_taken: string;
  timestamp: string;
}

export interface ImportReport {
  id: string;
  manager_id: string;
  created_at: string;
  accepted_count: number;
  rejected_count: number;
  merged_count: number;
  errors: ImportError[];
}
