import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

/** Admin-only in its entirety. None of this is public information. */
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private dashboard: DashboardService) {}

  /**
   * One request for the whole page rather than three. The cards, the bell and
   * the activity list all render together on the same paint; splitting them
   * would buy nothing and cost two round trips on the admin's first load.
   */
  @Get()
  async summary() {
    const [stats, notifications, activity] = await Promise.all([
      this.dashboard.stats(),
      this.dashboard.notifications(),
      this.dashboard.activity(),
    ]);
    return { stats, notifications, activity };
  }

  /** The bell alone, for refreshing the badge without re-reading the page. */
  @Get('notifications')
  notifications() {
    return this.dashboard.notifications();
  }
}
