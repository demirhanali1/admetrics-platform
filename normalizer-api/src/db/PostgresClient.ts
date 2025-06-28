import { AppDataSource } from "./data-source";
import { NormalizedEvent } from "../entity/NormalizedEvent";

export const saveNormalizedEvent = async (data: Omit<NormalizedEvent, "id">) => {
    const repo = AppDataSource.getRepository(NormalizedEvent);
    const event = repo.create(data);
    await repo.save(event);
};
