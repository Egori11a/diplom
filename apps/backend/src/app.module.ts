import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AdminsModule } from "./admins/admins.module";
import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { ExperimentsModule } from "./experiments/experiments.module";
import { SdkModule } from "./sdk/sdk.module";
import { EventsModule } from "./events/events.module";
import { DbModule } from "./db/db.module";
import { GroupsModule } from "./groups/groups.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DbModule,
    AuditModule,
    AuthModule,
    AdminsModule,
    ExperimentsModule,
    GroupsModule,
    SdkModule,
    EventsModule
  ]
})
export class AppModule {}
