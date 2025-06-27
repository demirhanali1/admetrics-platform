import { Router } from "express";
import { validateEventPayload } from "../validators/eventValidator";
import { sendMessageToSQS } from "../services/sqsService";

const router = Router();

router.post("/", async (req, res) => {
    const body = req.body;

    if (!validateEventPayload(body)) {
        return res.status(400).json({ error: "Invalid request body" });
    }

    try {
        const messageId = await sendMessageToSQS(body);
        res.status(200).json({ message: "Message sent", messageId });
    } catch (err) {
        console.error("Failed to send message to SQS:", err);
        res.status(500).json({ error: "Failed to send message" });
    }
});

export default router;
