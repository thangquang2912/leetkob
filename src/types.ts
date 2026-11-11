export type UserRole = 'ta' | 'student' | 'admin';

export interface Principal {
  readonly userId: string;
  readonly role: UserRole;
  readonly classIds: readonly string[];
}

export type ReviewReason = 'violation' | 'unsure' | 'sampled_pass';

export type ReviewStatus = 'pending' | 'reviewed';

export interface LabRecord {
  readonly labId: string;
  readonly classId: string;
  readonly title: string;
}

export interface ReviewQueueRecord {
  readonly reviewId: string;
  readonly labId: string;
  readonly submissionId: string;
  readonly reason: ReviewReason;
  readonly status: ReviewStatus;
  readonly queuedAt: string;
}

export interface ReviewQueueItemDto {
  readonly reviewId: string;
  readonly submissionId: string;
  readonly reason: ReviewReason;
  readonly queuedAt: string;
}

export interface ReviewQueuePageDto {
  readonly items: readonly ReviewQueueItemDto[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly hasNext: boolean;
}

export interface ReviewQueueStore {
  getLabById(labId: string): Promise<LabRecord | undefined>;
  listReviewRecordsByLab(labId: string): Promise<readonly ReviewQueueRecord[]>;
}

export type TokenVerifier = (token: string) => Principal | undefined;
