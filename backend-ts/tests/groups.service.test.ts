import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as groupsService from '../src/modules/groups/groups.service.js';
import User from '../src/models/user.model.js';
import { ValidationError } from '../src/lib/errors.js';

vi.mock('../src/models/user.model.js');
vi.mock('../src/models/group.model.js');

describe('Groups Service - Feature Restrictions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createGroup', () => {
        it('should fail if a member identifier is not an email', async () => {
            const input = {
                name: 'Test Group',
                members: ['JustAName']
            };
            const creatorId = '65bcd8e15c3260001bcdef01';

            // User.findOne will return null if identifier is not found
            (User.findOne as any).mockResolvedValue(null);

            await expect(groupsService.createGroup(input as any, creatorId))
                .rejects.toThrow();
        });

        it('should fail if a member email is not registered', async () => {
            const input = {
                name: 'Test Group',
                members: ['unregistered@example.com']
            };
            const creatorId = '65bcd8e15c3260001bcdef01';

            (User.findOne as any).mockResolvedValue(null);

            await expect(groupsService.createGroup(input as any, creatorId))
                .rejects.toThrow();
        });

        it('should fail if a user is found but isRegistered is false', async () => {
            const input = {
                name: 'Test Group',
                members: ['unregistered@example.com']
            };
            const creatorId = '65bcd8e15c3260001bcdef01';

            (User.findOne as any).mockResolvedValue({
                _id: 'some-id',
                email: 'unregistered@example.com',
                isRegistered: false
            });

            await expect(groupsService.createGroup(input as any, creatorId))
                .rejects.toThrow();
        });
    });
});
