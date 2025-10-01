import dotenv from 'dotenv';

// Load environment variables immediately when the module executes.
dotenv.config();

export function loadEnvironment(): void {
  // Intentionally empty: calling this function documents the bootstrap step.
}
