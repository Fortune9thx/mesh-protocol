import { v4 as uuid } from "uuid";
import { query } from "../db/schema.js";
import type { EventType } from "../types/index.js";

export async function emitEvent(
  eventType: EventType,
  entityId: string,
  entityType: string,
  payload: Record<string, unknown> = {}
) {
  const event = {
    event_id: uuid(),
    event_type: eventType,
    entity_id: entityId,
    entity_type: entityType,
    payload,
    timestamp: new Date(),
  };

  await query(
    `INSERT INTO events (event_id, event_type, entity_id, entity_type, payload, timestamp)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [event.event_id, event.event_type, event.entity_id, event.entity_type, JSON.stringify(event.payload), event.timestamp]
  );

  return event;
}

export async function getEvents(entityId?: string, entityType?: string, limit = 50) {
  if (entityId && entityType) {
    const { rows } = await query(
      "SELECT * FROM events WHERE entity_id = $1 AND entity_type = $2 ORDER BY timestamp DESC LIMIT $3",
      [entityId, entityType, limit]
    );
    return rows;
  }
  const { rows } = await query("SELECT * FROM events ORDER BY timestamp DESC LIMIT $1", [limit]);
  return rows;
}
