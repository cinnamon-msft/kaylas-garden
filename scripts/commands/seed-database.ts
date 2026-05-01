import pg from 'pg';
import type {
  CommandResultFormat,
  ExecuteCommandContext,
  ExecuteCommandResult,
  WithCommandOptions,
} from '../../.modules/aspire.js';

const { Client } = pg;
const markdownFormat = 'Markdown' as CommandResultFormat;

type ConnectionStringProvider = (context: ExecuteCommandContext) => Promise<string>;

interface DatabaseCommand {
  name: string;
  displayName: string;
  handler: (context: ExecuteCommandContext) => Promise<ExecuteCommandResult>;
  options: WithCommandOptions;
}

const samplePlants = [
  {
    name: 'Cherry Tomato',
    species: 'Solanum lycopersicum var. cerasiforme',
    careInfo: {
      sunlight: 'Full sun (6-8 hours)',
      wateringSchedule: 'Every 1-2 days, keep soil consistently moist',
      soilType: 'Rich, well-draining loam with compost',
      hardinessZone: '4-11',
      companionPlants: ['Basil', 'Marigolds', 'Carrots', 'Parsley'],
      commonPests: ['Tomato hornworm', 'Aphids', 'Blossom end rot'],
      generalNotes: 'Indeterminate variety. Stake or cage for support. Pinch suckers for larger fruit.',
    },
    wateringIntervalDays: 2,
  },
  {
    name: 'Sweet Basil',
    species: 'Ocimum basilicum',
    careInfo: {
      sunlight: 'Full sun (6+ hours)',
      wateringSchedule: 'Every 2-3 days, avoid waterlogged soil',
      soilType: 'Moist, well-drained, slightly acidic',
      hardinessZone: '10-11 (annual elsewhere)',
      companionPlants: ['Tomatoes', 'Peppers', 'Oregano'],
      commonPests: ['Japanese beetles', 'Slugs', 'Fusarium wilt'],
      generalNotes: 'Pinch flower buds to encourage bushy growth. Harvest leaves regularly from the top.',
    },
    wateringIntervalDays: 3,
  },
  {
    name: 'Jalapeño Pepper',
    species: 'Capsicum annuum',
    careInfo: {
      sunlight: 'Full sun (8+ hours)',
      wateringSchedule: 'Every 2-3 days, let top inch dry between waterings',
      soilType: 'Sandy loam, well-draining, slightly acidic',
      hardinessZone: '5-11',
      companionPlants: ['Tomatoes', 'Basil', 'Carrots', 'Spinach'],
      commonPests: ['Aphids', 'Pepper weevils', 'Blossom end rot'],
      generalNotes: 'Fruits in 70-80 days. Pick when firm and green, or wait for red for more heat.',
    },
    wateringIntervalDays: 3,
  },
  {
    name: 'Strawberry',
    species: 'Fragaria × ananassa',
    careInfo: {
      sunlight: 'Full sun (6-10 hours)',
      wateringSchedule: 'Every 1-2 days, 1-1.5 inches per week',
      soilType: 'Sandy loam, slightly acidic (pH 5.5-6.8)',
      hardinessZone: '3-10',
      companionPlants: ['Borage', 'Lettuce', 'Spinach', 'Thyme'],
      commonPests: ['Slugs', 'Birds', 'Spider mites', 'Gray mold'],
      generalNotes: 'Mulch around plants to suppress weeds and keep berries clean. Remove runners for larger fruit.',
    },
    wateringIntervalDays: 2,
  },
  {
    name: 'Lavender',
    species: 'Lavandula angustifolia',
    careInfo: {
      sunlight: 'Full sun (6+ hours)',
      wateringSchedule: 'Every 7-10 days once established, drought tolerant',
      soilType: 'Sandy, well-draining, alkaline',
      hardinessZone: '5-9',
      companionPlants: ['Roses', 'Echinacea', 'Yarrow'],
      commonPests: ['Whiteflies', 'Root rot (from overwatering)'],
      generalNotes: 'Prune after flowering to maintain shape. Excellent for pollinators and dried arrangements.',
    },
    wateringIntervalDays: 7,
  },
];

export function createSeedDatabaseCommand(
  gardenDbName: string,
  getConnectionString: ConnectionStringProvider
): DatabaseCommand {
  return {
    name: 'seed-database',
    displayName: 'Seed sample plants',
    handler: async (context) => {
      let client: pg.Client | undefined;

      try {
        const connectionString = await getConnectionString(context);
        client = new Client({ connectionString });

        await client.connect();

        // Ensure there's at least one user to attach plants to
        const userResult = await client.query<{ id: string }>(`
          SELECT id FROM users LIMIT 1
        `);

        if (userResult.rows.length === 0) {
          return {
            success: false,
            errorMessage: 'No users found. Sign in to the app first, then run this command.',
            data: {
              value: '### Cannot seed database\n\nNo users exist yet. Sign in to the app first to create your account, then run this command again.',
              format: markdownFormat,
              displayImmediately: true,
            },
          };
        }

        const userId = userResult.rows[0].id;
        const plantNames: string[] = [];

        for (const plant of samplePlants) {
          const existingPlant = await client.query<{ id: string }>(
            `SELECT id
             FROM plants
             WHERE user_id = $1
               AND name = $2
               AND species = $3
             LIMIT 1`,
            [userId, plant.name, plant.species]
          );

          if (existingPlant.rows.length > 0) {
            await client.query(
              `UPDATE plants
               SET care_info = $1,
                   watering_interval_days = $2
               WHERE id = $3`,
              [JSON.stringify(plant.careInfo), plant.wateringIntervalDays, existingPlant.rows[0].id]
            );
          } else {
            await client.query(
              `INSERT INTO plants (id, user_id, name, species, date_added, care_info, watering_interval_days, created_at)
               VALUES ($1, $2, $3, $4, NOW(), $5, $6, NOW())`,
              [crypto.randomUUID(), userId, plant.name, plant.species, JSON.stringify(plant.careInfo), plant.wateringIntervalDays]
            );
          }

          plantNames.push(plant.name);
        }

        return {
          success: true,
          message: `Seeded ${plantNames.length} sample plant(s).`,
          data: {
            value: [
              '### Database seeded',
              '',
              `Seeded **${plantNames.length}** sample plant(s) in \`${gardenDbName}\` for user \`${userId}\`:`,
              '',
              ...plantNames.map((name) => `- ${name}`),
            ].join('\n'),
            format: markdownFormat,
            displayImmediately: true,
          },
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          success: false,
          errorMessage: `Failed to seed database: ${message}`,
          data: {
            value: `### Failed to seed database\n\n\`${message}\``,
            format: markdownFormat,
            displayImmediately: true,
          },
        };
      } finally {
        if (client) {
          await client.end();
        }
      }
    },
    options: {
      commandOptions: {
        description: 'Inserts sample plants (tomato, basil, pepper, strawberry, lavender) into the database for the first user.',
        confirmationMessage: 'This will add sample plants to the database. Continue?',
        iconName: 'Add',
      },
    },
  };
}
