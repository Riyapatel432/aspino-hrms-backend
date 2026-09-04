import { Test, TestingModule } from '@nestjs/testing';
import { RecruitmentService } from './recruitment.service';
import { RecruitmentRepository } from '../repositories/recruitment.repository';
import { PrismaService } from '../../../database/prisma/prisma.service';

describe('RecruitmentService', () => {
  let service: RecruitmentService;
  let repo: any;
  let prisma: any;

  beforeEach(async () => {
    repo = {
      findJobPostings: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      createJobPosting: jest
        .fn()
        .mockResolvedValue({ id: 'job-1', title: 'Developer' }),
      findCandidates: jest.fn().mockResolvedValue({ data: [], total: 0 }),
      createCandidate: jest
        .fn()
        .mockResolvedValue({ id: 'cand-1', name: 'Alice' }),
    };

    prisma = {
      jobPosting: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
      },
      candidate: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        update: jest.fn(),
      },
      interviewSchedule: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecruitmentService,
        { provide: RecruitmentRepository, useValue: repo },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<RecruitmentService>(RecruitmentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Candidate Validation', () => {
    it('should throw ConflictException when creating candidate with duplicate email', async () => {
      prisma.candidate.findFirst = jest.fn().mockResolvedValueOnce({ id: 'c-1', email: 'test@example.com' });
      await expect(
        service.createCandidate({
          name: 'Test Candidate',
          email: 'test@example.com',
          phone: '9876543210',
          resumeUrl: '/uploads/resumes/res.pdf',
          source: 'Portal',
          requisitionId: 'req-1',
        }),
      ).rejects.toThrow('Candidate with this email already exists.');
    });

    it('should throw ConflictException when creating candidate with duplicate phone number', async () => {
      prisma.candidate.findFirst = jest
        .fn()
        .mockResolvedValueOnce(null) // Email check passes
        .mockResolvedValueOnce({ id: 'c-2', phone: '9876543210' }); // Phone check fails

      await expect(
        service.createCandidate({
          name: 'Test Candidate',
          email: 'new@example.com',
          phone: '9876543210',
          resumeUrl: '/uploads/resumes/res.pdf',
          source: 'Portal',
          requisitionId: 'req-1',
        }),
      ).rejects.toThrow('Candidate with this phone number already exists.');
    });

    it('should throw BadRequestException when email contains special character % in username for Gmail', async () => {
      await expect(
        service.createCandidate({
          name: 'Test Candidate',
          email: 'riya%@gmail.com',
          phone: '9876543210',
          resumeUrl: '/uploads/resumes/res.pdf',
          source: 'Portal',
          requisitionId: 'req-1',
        }),
      ).rejects.toThrow();
    });

    it('should successfully create candidate when email and phone are valid and unique', async () => {
      prisma.candidate.findFirst = jest.fn().mockResolvedValue(null);
      const res = await service.createCandidate({
        name: 'Alice',
        email: 'alice.patel@gmail.com',
        phone: '9876543210',
        resumeUrl: '/uploads/resumes/res.pdf',
        source: 'Portal',
        requisitionId: 'req-1',
      });
      expect(res).toEqual({ id: 'cand-1', name: 'Alice' });
    });
  });

  describe('Interview Feedback Validation', () => {
    it('should throw BadRequestException when trying to submit feedback before interview time', async () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days in future
      prisma.interviewSchedule = {
        findUnique: jest.fn().mockResolvedValue({
          id: 'sched-1',
          scheduledAt: futureDate,
        }),
      };

      await expect(
        service.createFeedback({
          scheduleId: 'sched-1',
          panelistName: 'Interviewer',
          rating: 8,
          comments: 'Great performance and good skills',
          recommendation: 'SELECT' as any,
        }),
      ).rejects.toThrow(
        'Feedback cannot be submitted before the scheduled interview time.',
      );
    });

    it('should successfully record feedback if interview time is in the past', async () => {
      const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 2); // 2 hours ago
      prisma.interviewSchedule = {
        findUnique: jest.fn().mockResolvedValue({
          id: 'sched-2',
          scheduledAt: pastDate,
        }),
      };
      repo.createFeedback = jest.fn().mockResolvedValue({ id: 'fb-1', rating: 9 });
      repo.updateScheduleStatus = jest.fn().mockResolvedValue({ id: 'sched-2', status: 'COMPLETED' });

      const res = await service.createFeedback({
        scheduleId: 'sched-2',
        panelistName: 'Interviewer',
        rating: 9,
        comments: 'Excellent technical answers and problem solving',
        recommendation: 'SELECT' as any,
      });

      expect(res).toEqual({ id: 'fb-1', rating: 9 });
      expect(repo.updateScheduleStatus).toHaveBeenCalledWith('sched-2', 'COMPLETED');
    });
  });

  describe('Sequential Interview Schedule Validation', () => {
    it('should throw BadRequestException when scheduling a 2nd round before the 1st round date', async () => {
      const round1Date = new Date('2026-09-10T16:00:00.000Z');
      const round2Date = new Date('2026-09-03T17:42:00.000Z'); // Before round 1!

      prisma.interviewSchedule.findMany = jest.fn().mockResolvedValue([
        {
          id: 'sched-round-1',
          roundName: 'Round 1',
          scheduledAt: round1Date,
        },
      ]);

      await expect(
        service.createSchedule({
          candidateId: 'cand-1',
          roundName: 'Round 2',
          scheduledAt: round2Date.toISOString(),
          panelists: ['Admin'],
        }),
      ).rejects.toThrow('Subsequent interview round must be scheduled after previous round');
    });

    it('should successfully schedule a 2nd round when scheduled after the 1st round date', async () => {
      const round1Date = new Date('2026-09-10T16:00:00.000Z');
      const round2Date = new Date('2026-09-12T11:00:00.000Z'); // After round 1

      prisma.interviewSchedule.findMany = jest.fn().mockResolvedValue([
        {
          id: 'sched-round-1',
          roundName: 'Round 1',
          scheduledAt: round1Date,
        },
      ]);
      repo.createSchedule = jest.fn().mockResolvedValue({
        id: 'sched-round-2',
        roundName: 'Round 2',
        scheduledAt: round2Date,
      });

      const res = await service.createSchedule({
        candidateId: 'cand-1',
        roundName: 'Round 2',
        scheduledAt: round2Date.toISOString(),
        panelists: ['Admin'],
      });

      expect(res).toEqual({
        id: 'sched-round-2',
        roundName: 'Round 2',
        scheduledAt: round2Date,
      });
    });
  });
});
