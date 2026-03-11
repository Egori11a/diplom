import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { ExperimentsModule } from "./experiments/experiments.module";
import { SdkModule } from "./sdk/sdk.module";
import { EventsModule } from "./events/events.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { DbModule } from "./db/db.module";
import { GroupsModule } from "./groups/groups.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DbModule,
    AuthModule,
    ExperimentsModule,
    GroupsModule,
    SdkModule,
    EventsModule,
    AnalyticsModule
  ]
})
export class AppModule {}
