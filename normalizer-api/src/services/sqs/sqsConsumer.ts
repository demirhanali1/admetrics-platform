import {SqsClientWrapper} from "./SqsClientWrapper";
import {MessageProcessor} from "./MessageProcessor";

export const startSqsConsumer = async () => {
    const sqs = new SqsClientWrapper(
        process.env.AWS_REGION!,
        process.env.AWS_ACCESS_KEY_ID!,
        process.env.AWS_SECRET_ACCESS_KEY!,
        process.env.SQS_QUEUE_URL!
    );

    const processor = new MessageProcessor();

    while (true) {
        try {
            const messages = await sqs.receiveMessages();

            for (const message of messages) {
                console.log(`Received message with ID: ${message.MessageId}`);

                if (!message.Body) continue;

                try {
                    await processor.process(message.Body);
                    await sqs.deleteMessage(message.ReceiptHandle!);
                    console.log(`Message processed and deleted: ${message.MessageId}`);
                } catch (err) {
                    console.error("Message processing failed:", err);
                    // DLQ yönlendirme burada olabilir
                }
            }
        } catch (err) {
            console.error("Error receiving messages from SQS:", err);
        }
    }
};
