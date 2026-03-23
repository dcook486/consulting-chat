import { createDb, migrate } from "./migrate.js";

const db = createDb();
migrate(db);

export default db;
