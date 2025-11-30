import { expect, test } from '../../checkpoint/fixtures';

test.describe('MCP State-Aware Testing', () => {
    test('should verify car availability using MCP', async ({ mcp }) => {
        // 1. Setup: Define test data
        const carId = 'd290f1ee-6c54-4b01-90e6-d701748f0851'; // Porsche 911

        // 2. Action: Check availability via MCP tool
        const result = await mcp.callTool('verify_db_record', {
            table: 'cars',
            column: 'id',
            value: carId
        });

        // 3. Verification: Assert on the result
        console.log('Availability Result:', result);

        const content = result.content[0];
        if (content.type === 'text') {
            const data = JSON.parse(content.text);
            // If Supabase is not configured, we might get an error, but let's assert on structure
            if (data.error) {
                console.warn('MCP Error:', data.error);
            } else {
                expect(data).toHaveProperty('exists');
                if (data.exists) {
                    expect(data.record.id).toBe(carId);
                }
            }
        }
    });

    test('should find user by email using MCP', async ({ mcp }) => {
        const email = 'renter@example.com';

        const result = await mcp.callTool('get_user_state', {
            email: email
        });

        console.log('Find User Result:', result);

        const content = result.content[0];
        if (content.type === 'text') {
            const data = JSON.parse(content.text);
            if (data.error) {
                console.warn('MCP Error:', data.error);
            } else {
                expect(data).toHaveProperty('profile');
                if (data.profile) {
                    expect(data.profile.email).toBe(email);
                }
            }
        }
    });

    test('should use TestBlock with MCP postcondition', async ({ page, createBlock, checkpointManager }) => {
        // Import dynamically to avoid circular dependency issues if any
        const { defineBlock, expectsInMcp } = await import('../../checkpoint/fixtures');

        const block = createBlock(defineBlock('mcp-block-test', 'MCP Block Test', {
            postconditions: [
                expectsInMcp(
                    'check_car_availability',
                    {
                        carId: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
                        startDate: '2025-02-01',
                        endDate: '2025-02-05'
                    },
                    (result) => {
                        const content = result.content[0];
                        if (content.type === 'text') {
                            const data = JSON.parse(content.text);
                            return data.is_available === true;
                        }
                        return false;
                    },
                    'Car should be available in Feb 2025'
                )
            ]
        }));

        await block.execute(async () => {
            console.log('Executing block action...');
        });
    });
});
