import mongoose from "mongoose";
import {RawEvent} from "../domain/RawEvent";

const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
    throw new Error("MONGO_URI is not defined in environment variables");
}
const RawEventSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
const RawEventModel = mongoose.models.RawEvent || mongoose.model("RawEvent", RawEventSchema);

let isConnected = false;

const connectMongo = async () => {
    if (isConnected) return;
    await mongoose.connect(mongoUri);
    isConnected = true;
};

export const saveRawEvent = async (data: RawEvent) => {
    await connectMongo();
    await RawEventModel.create(data);
};
