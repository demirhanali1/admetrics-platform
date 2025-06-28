import { Router } from 'express';
import { DIContainer } from '../container/DIContainer';

const router = Router();

const eventController = DIContainer.getInstance().getEventController();

router.post('/', (req, res) => {
  eventController.handleEventPost(req, res);
});

export default router;
