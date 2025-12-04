import { BaseUexRepository } from './base-uex.repository';

describe('BaseUexRepository', () => {
  let repository: any;

  // Mock data
  const mockCategory = {
    id: 1,
    uexId: 100,
    name: 'Test Category',
    type: 'item',
    active: true,
    deleted: false,
    dateAdded: new Date(),
    dateModified: new Date(),
  };

  const mockInactiveCategory = {
    id: 3,
    uexId: 102,
    name: 'Inactive Category',
    type: 'item',
    active: false,
    deleted: false,
    dateAdded: new Date(),
    dateModified: new Date(),
  };

  beforeEach(() => {
    // Create a mock repository with all BaseUexRepository methods
    repository = Object.create(BaseUexRepository.prototype);
    repository.find = jest.fn();
    repository.findOne = jest.fn();
    repository.update = jest.fn();
  });

  describe('findAllActive', () => {
    it('should find all non-deleted records', async () => {
      const findSpy = jest
        .spyOn(repository, 'find')
        .mockResolvedValue([mockCategory, mockInactiveCategory] as any);

      const result = await repository.findAllActive();

      expect(findSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deleted: false },
        }),
      );
      expect(result).toHaveLength(2);
    });

    it('should merge custom where conditions', async () => {
      const findSpy = jest.spyOn(repository, 'find').mockResolvedValue([]);

      await repository.findAllActive({
        where: { type: 'item' } as any,
      });

      expect(findSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { type: 'item', deleted: false },
        }),
      );
    });
  });

  describe('findActive', () => {
    it('should find all active and non-deleted records', async () => {
      const findSpy = jest
        .spyOn(repository, 'find')
        .mockResolvedValue([mockCategory] as any);

      const result = await repository.findActive();

      expect(findSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deleted: false, active: true },
        }),
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('findOneActive', () => {
    it('should find one non-deleted record', async () => {
      const findOneSpy = jest
        .spyOn(repository, 'findOne')
        .mockResolvedValue(mockCategory as any);

      const result = await repository.findOneActive({
        where: { uexId: 100 } as any,
      });

      expect(findOneSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { uexId: 100, deleted: false },
        }),
      );
      expect(result).toBeDefined();
      expect(result?.uexId).toBe(100);
    });

    it('should return null if not found', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      const result = await repository.findOneActive({
        where: { uexId: 999 } as any,
      });

      expect(result).toBeNull();
    });
  });

  describe('findOneActiveOnly', () => {
    it('should find one active and non-deleted record', async () => {
      const findOneSpy = jest
        .spyOn(repository, 'findOne')
        .mockResolvedValue(mockCategory as any);

      const result = await repository.findOneActiveOnly({
        where: { uexId: 100 } as any,
      });

      expect(findOneSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { uexId: 100, deleted: false, active: true },
        }),
      );
      expect(result).toBeDefined();
    });
  });

  describe('findByUexId', () => {
    it('should find a record by uexId', async () => {
      const findOneSpy = jest
        .spyOn(repository, 'findOne')
        .mockResolvedValue(mockCategory as any);

      const result = await repository.findByUexId(100);

      expect(findOneSpy).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result?.uexId).toBe(100);
    });
  });

  describe('markAsDeleted', () => {
    it('should soft delete a record by id', async () => {
      const updateSpy = jest
        .spyOn(repository, 'update')
        .mockResolvedValue({} as any);

      await repository.markAsDeleted(1, 999);

      expect(updateSpy).toHaveBeenCalledWith(1, {
        deleted: true,
        modifiedById: 999,
      });
    });
  });

  describe('markAsDeletedByUexId', () => {
    it('should soft delete a record by uexId', async () => {
      const updateSpy = jest
        .spyOn(repository, 'update')
        .mockResolvedValue({} as any);

      await repository.markAsDeletedByUexId(100, 999);

      expect(updateSpy).toHaveBeenCalledWith(
        { uexId: 100 },
        {
          deleted: true,
          modifiedById: 999,
        },
      );
    });
  });

  describe('deactivate', () => {
    it('should mark a record as inactive', async () => {
      const updateSpy = jest
        .spyOn(repository, 'update')
        .mockResolvedValue({} as any);

      await repository.deactivate(1, 999);

      expect(updateSpy).toHaveBeenCalledWith(1, {
        active: false,
        modifiedById: 999,
      });
    });
  });

  describe('activate', () => {
    it('should mark a record as active', async () => {
      const updateSpy = jest
        .spyOn(repository, 'update')
        .mockResolvedValue({} as any);

      await repository.activate(1, 999);

      expect(updateSpy).toHaveBeenCalledWith(1, {
        active: true,
        modifiedById: 999,
      });
    });
  });
});
