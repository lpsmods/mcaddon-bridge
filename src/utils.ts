import { world } from "@minecraft/server";
import { bridgeObject } from "./bridge";
import { PacketData } from "./packet";

/**
 * Create a random UUID.
 * @returns {string}
 */
export function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getObject(
  objectName: string,
  data: PacketData,
): bridgeObject | undefined {
  switch (objectName) {
    case "World":
      return world;
    case "Entity":
      return world.getEntity(data.get("entityId"));
  }
}
