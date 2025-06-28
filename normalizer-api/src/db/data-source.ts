import "reflect-metadata";
import { DataSource } from "typeorm";
import { NormalizedEvent } from "../entity/NormalizedEvent";

export const AppDataSource = new DataSource({
    type: "postgres",
    url: process.env.POSTGRES_URI,
    entities: [NormalizedEvent],
    synchronize: true, // Geliştirme için true. Prod’da migration kullan.
});
