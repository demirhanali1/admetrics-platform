import { config } from "dotenv";

config();

import app from "./app";

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`Collector API running on http://localhost:${port}`);
});
