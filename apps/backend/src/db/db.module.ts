import { Global, Module, OnModuleInit } from "@nestjs/common";
import { DbService } from "./db.service";

@Global()
@Module({
  providers: [DbService],
  exports: [DbService]
})
export class DbModule implements OnModuleInit {
  constructor(private readonly db: DbService) {}

  async onModuleInit(): Promise<void> {
    await this.db.ensureSchema();
  }
}
