import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from "@aws-sdk/client-sqs";

export class SqsClientWrapper {
    private client: SQSClient;
    private queueUrl: string;

    constructor(region: string, accessKeyId: string, secretAccessKey: string, queueUrl: string) {
        this.queueUrl = queueUrl;
        this.client = new SQSClient({
            region,
            credentials: { accessKeyId, secretAccessKey },
        });
    }

    async receiveMessages() {
        const command = new ReceiveMessageCommand({
            QueueUrl: this.queueUrl,
            MaxNumberOfMessages: 1,
            WaitTimeSeconds: 10,
        });

        const response = await this.client.send(command);
        return response.Messages || [];
    }

    async deleteMessage(receiptHandle: string) {
        await this.client.send(
            new DeleteMessageCommand({
                QueueUrl: this.queueUrl,
                ReceiptHandle: receiptHandle,
            })
        );
    }
}
