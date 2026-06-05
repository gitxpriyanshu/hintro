const actionItemsService = require('../src/modules/actionItems/actionItems.service');
const prisma = require('../src/config/database');
const { NotFoundError, ValidationError } = require('../src/utils/errors');

// Mock Prisma client
jest.mock('../src/config/database', () => ({
  actionItem: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn()
  }
}));

describe('Action Items Module Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getOverdueActionItems', () => {
    test('Should return overdue action items where status is not COMPLETED and dueDate is in the past', async () => {
      const mockUserId = 'user-uuid-123';
      const mockOverdueItems = [
        {
          id: 'item-1',
          task: 'Finish API documentation',
          assignee: 'Jane Doe',
          dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
          status: 'PENDING',
          meetingId: 'meeting-1',
          meeting: {
            id: 'meeting-1',
            title: 'Sprint Kickoff',
            meetingDate: new Date()
          }
        },
        {
          id: 'item-2',
          task: 'Write unit tests',
          assignee: 'Bob',
          dueDate: new Date(Date.now() - 3600 * 1000), // 1 hour ago
          status: 'IN_PROGRESS',
          meetingId: 'meeting-1',
          meeting: {
            id: 'meeting-1',
            title: 'Sprint Kickoff',
            meetingDate: new Date()
          }
        }
      ];

      prisma.actionItem.findMany.mockResolvedValue(mockOverdueItems);

      const result = await actionItemsService.getOverdueActionItems(mockUserId);

      // Verify Prisma call
      expect(prisma.actionItem.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.actionItem.findMany).toHaveBeenCalledWith({
        where: {
          status: { not: 'COMPLETED' },
          dueDate: {
            not: null,
            lt: expect.any(Date)
          },
          meeting: { userId: mockUserId }
        },
        include: {
          meeting: {
            select: {
              id: true,
              title: true,
              meetingDate: true
            }
          }
        },
        orderBy: { dueDate: 'asc' }
      });

      // Verify output
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('item-1');
      expect(result[1].status).toBe('IN_PROGRESS');
    });
  });

  describe('updateActionItemStatus', () => {
    test('Should update an action item status to COMPLETED successfully', async () => {
      const mockActionItemId = 'item-1';
      const mockUserId = 'user-uuid-123';
      const mockActionItem = {
        id: mockActionItemId,
        task: 'Finish API documentation',
        status: 'PENDING',
        meetingId: 'meeting-1',
        meeting: {
          userId: mockUserId
        }
      };

      const mockUpdatedActionItem = {
        ...mockActionItem,
        status: 'COMPLETED'
      };

      prisma.actionItem.findFirst.mockResolvedValue(mockActionItem);
      prisma.actionItem.update.mockResolvedValue(mockUpdatedActionItem);

      const result = await actionItemsService.updateActionItemStatus(
        mockActionItemId,
        'COMPLETED',
        mockUserId
      );

      // Verify Prisma first checks existence and ownership
      expect(prisma.actionItem.findFirst).toHaveBeenCalledTimes(1);
      expect(prisma.actionItem.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockActionItemId,
          meeting: { userId: mockUserId }
        }
      });

      // Verify Prisma performs the update
      expect(prisma.actionItem.update).toHaveBeenCalledTimes(1);
      expect(prisma.actionItem.update).toHaveBeenCalledWith({
        where: { id: mockActionItemId },
        data: { status: 'COMPLETED' }
      });

      expect(result.status).toBe('COMPLETED');
    });

    test('Should throw NotFoundError if action item does not exist or user does not own it', async () => {
      prisma.actionItem.findFirst.mockResolvedValue(null);

      await expect(
        actionItemsService.updateActionItemStatus('invalid-item-id', 'COMPLETED', 'user-123')
      ).rejects.toThrow(NotFoundError);

      expect(prisma.actionItem.findFirst).toHaveBeenCalledTimes(1);
      expect(prisma.actionItem.update).not.toHaveBeenCalled();
    });

    test('Should throw ValidationError if status is invalid', async () => {
      const mockActionItemId = 'item-1';
      const mockUserId = 'user-uuid-123';
      const mockActionItem = {
        id: mockActionItemId,
        task: 'Finish API documentation',
        status: 'PENDING',
        meetingId: 'meeting-1',
        meeting: {
          userId: mockUserId
        }
      };

      prisma.actionItem.findFirst.mockResolvedValue(mockActionItem);

      await expect(
        actionItemsService.updateActionItemStatus(mockActionItemId, 'INVALID_STATUS', mockUserId)
      ).rejects.toThrow(ValidationError);

      expect(prisma.actionItem.findFirst).toHaveBeenCalledTimes(1);
      expect(prisma.actionItem.update).not.toHaveBeenCalled();
    });
  });
});
