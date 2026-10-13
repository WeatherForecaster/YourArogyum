import { apiRequest } from "../api/client";

export type AssessmentData = Record<string, string>;

export interface AssessmentResult {
  completed: boolean;
  assessment: AssessmentData | null;
}

export interface SaveAssessmentResponse {
  message: string;
  completed: boolean;
  assessment: AssessmentData;
}

export function getMyAssessment(): Promise<AssessmentResult> {
  return apiRequest<AssessmentResult>("/api/assessment/me", {
    method: "GET",
  });
}

export function saveMyAssessment(
  data: AssessmentData,
): Promise<SaveAssessmentResponse> {
  return apiRequest<SaveAssessmentResponse>("/api/assessment/me", {
    method: "PUT",
    body: data,
  });
}
