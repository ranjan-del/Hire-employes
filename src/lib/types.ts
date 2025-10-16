import { z } from "zod";
export const CandidateZ = z.object({
  name: z.string().nullish(),
  email: z.string().email(),
  location: z.string().optional().default(""),
  skills: z.array(z.string()).default([]),
  work_experiences: z.array(z.object({ roleName: z.string().optional() })).default([]),
  education: z.any().optional(),
  annual_salary_expectation: z.any().optional()
});
export type Candidate = z.infer<typeof CandidateZ>;
