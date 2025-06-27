import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from "@aws-sdk/client-sqs";
import {NormalizeMessage} from "../app/NormalizeMessage";

const sqsClient = new SQSClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
});

export const startSqsConsumer = async () => {
    while (true) {
        try {
            const command = new ReceiveMessageCommand({
                QueueUrl: process.env.SQS_QUEUE_URL,
                MaxNumberOfMessages: 1,
                WaitTimeSeconds: 10,
            });

            const response = await sqsClient.send(command);
            const messages = response.Messages;

            if (messages && messages.length > 0) {
                for (const message of messages) {
                    console.log(`Received message with ID: ${message.MessageId}`);

                    if (!message.Body) continue;

                    try {
                        const payload = JSON.parse(message.Body);
                        await NormalizeMessage(payload);

                        await sqsClient.send(
                            new DeleteMessageCommand({
                                QueueUrl: process.env.SQS_QUEUE_URL,
                                ReceiptHandle: message.ReceiptHandle,
                            })
                        );

                        console.log(`Message processed and deleted: ${message.MessageId}`);
                    } catch (err) {
                        // Burada DLQ yönlendirme eklenebilir
                        throw err;
                    }
                }
            }
        } catch (err) {
            console.error("Error receiving messages from SQS:", err);
            throw err;
        }
    }
};
