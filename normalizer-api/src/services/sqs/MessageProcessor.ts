import {NormalizeMessage} from "../../app/NormalizeMessage";

export class MessageProcessor {
    async process(messageBody: string) {
        const payload = JSON.parse(messageBody);
        await NormalizeMessage(payload);
    }
}
